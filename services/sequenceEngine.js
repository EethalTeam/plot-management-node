const SequenceDefinition = require("../models/masterModels/SequenceDefinition");
const SequenceEnrollment = require("../models/masterModels/SequenceEnrollment");
const EmailLog = require("../models/masterModels/EmailLog");
const { sendTextMessage, sendTemplateMessage } = require("./whatsappOutbox");
const emailOutbox = require("./emailOutbox");
const { interpolate } = require("./messageInterpolation");

const DELAY_MS = {
  immediately: 0,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

function digitsOnly(value) {
  return (value || "").replace(/\D/g, "");
}

function resolveWaid(lead) {
  return lead.whatsapp_waid || digitsOnly(lead.leadPhone);
}

function resolveEmail(lead) {
  return lead.leadEmail || null;
}

async function sendWhatsAppStep(step, lead, waid) {
  if (!waid) {
    console.log(`Sequence step skipped (lead ${lead._id} has no WhatsApp number)`);
    return;
  }
  if (step.messageType === "template") {
    if (!step.templateName) return;
    await sendTemplateMessage({
      waid,
      templateName: step.templateName,
      languageCode: step.templateLanguageCode || "en_US",
      leadId: lead._id,
    });
    return;
  }
  const text = await interpolate(step.text, {}, lead);
  if (text) {
    await sendTextMessage({ waid, text, leadId: lead._id });
  }
}

// Logs to EmailLog either way (mirrors EmailControllers.sendEmail) so a
// drip step shows up in the same lead-detail email history as a manually
// sent message — and doesn't rethrow, matching the fail-open pattern the
// WhatsApp side already gets for free from advance()'s own try/catch.
async function sendEmailStep(step, lead, email) {
  if (!email) {
    console.log(`Sequence step skipped (lead ${lead._id} has no email address)`);
    return;
  }

  const subject = await interpolate(step.subject, {}, lead);
  const body = await interpolate(step.text, {}, lead);
  if (!subject && !body) return;

  let status = "sent";
  let errorMessage;
  try {
    await emailOutbox.sendEmail({ to: [email], subject, body });
  } catch (error) {
    status = "failed";
    errorMessage = error.message;
  }

  await EmailLog.create({
    to: [email],
    subject,
    body,
    status,
    errorMessage,
    leadId: lead._id,
    sentAt: new Date(),
  });
}

async function sendStep(step, lead, enrollment) {
  if (step.channel === "email") {
    await sendEmailStep(step, lead, enrollment.email);
  } else {
    await sendWhatsAppStep(step, lead, enrollment.waid);
  }
}

// Sends every step of `enrollment` that's currently due (delay elapsed
// since the previous step, or since enrollment for step 0), advancing
// nextStepIndex/nextSendAt as it goes, then stops once the next step isn't
// due yet (leaving it for the next processDueSteps poll). A send failure
// (24h window closed, template not approved yet, etc.) is logged but still
// advances — same fail-open pattern as whatsappFlowEngine.js and the
// existing site-visit reminders job.
async function advance(enrollment, sequence, lead) {
  // Checked fresh on every step, not just once at enrollment — a lead can
  // opt out hours or days after enrolling but before a later delayed step
  // fires. optInHandler.js already cancels the enrollment outright when it
  // handles the opt-out itself; this catches opt_in_status changing any
  // other way.
  if (lead.opt_in_status === "opted_out") {
    enrollment.status = "cancelled";
    enrollment.nextSendAt = null;
    await enrollment.save();
    return;
  }

  while (enrollment.status === "active" && enrollment.nextStepIndex < sequence.steps.length) {
    if (!enrollment.nextSendAt || enrollment.nextSendAt.getTime() > Date.now()) {
      return;
    }

    const step = sequence.steps[enrollment.nextStepIndex];
    try {
      await sendStep(step, lead, enrollment);
    } catch (error) {
      console.error(
        `Sequence step send failed (enrollment ${enrollment._id}, step ${step.stepId}):`,
        error.message,
      );
    }

    enrollment.nextStepIndex += 1;
    if (enrollment.nextStepIndex < sequence.steps.length) {
      const nextDelay = DELAY_MS[sequence.steps[enrollment.nextStepIndex].delay] ?? 0;
      enrollment.nextSendAt = new Date(Date.now() + nextDelay);
    } else {
      enrollment.status = "completed";
      enrollment.nextSendAt = null;
    }
    await enrollment.save();
  }
}

// Called from the same real lead-creation paths as Lead Distribution's
// autoAssignLead. Enrolls the lead in every enabled "new_lead" sequence and
// immediately runs the first due step(s) rather than waiting for the next
// poll — mirrors whatsappFlowEngine.js's tryStartFlow sending its first
// node synchronously.
exports.tryEnrollNewLead = async (lead) => {
  if (lead.opt_in_status === "opted_out") return;

  const waid = resolveWaid(lead);
  const email = resolveEmail(lead);
  if (!waid && !email) {
    console.log(`Sequence enrollment skipped (no WhatsApp number or email) for lead ${lead._id}`);
    return;
  }

  const sequences = await SequenceDefinition.find({
    enabled: true,
    "trigger.triggerType": "new_lead",
  });

  for (const sequence of sequences) {
    if (!sequence.steps.length) continue;

    const firstDelay = DELAY_MS[sequence.steps[0].delay] ?? 0;
    const enrollment = await SequenceEnrollment.create({
      leadId: lead._id,
      sequenceId: sequence._id,
      waid,
      email,
      nextStepIndex: 0,
      nextSendAt: new Date(Date.now() + firstDelay),
      status: "active",
    });

    await advance(enrollment, sequence, lead);
  }
};

// Scheduled job entry point (see queues/scheduledJobs.js /
// queues/scheduledWorker.js, "whatsapp-sequence-steps").
exports.processDueSteps = async () => {
  const due = await SequenceEnrollment.find({
    status: "active",
    nextSendAt: { $lte: new Date() },
  }).populate("leadId");

  let processed = 0;
  for (const enrollment of due) {
    if (!enrollment.leadId) {
      enrollment.status = "cancelled";
      enrollment.nextSendAt = null;
      await enrollment.save();
      continue;
    }
    const sequence = await SequenceDefinition.findById(enrollment.sequenceId);
    if (!sequence) {
      enrollment.status = "cancelled";
      enrollment.nextSendAt = null;
      await enrollment.save();
      continue;
    }
    await advance(enrollment, sequence, enrollment.leadId);
    processed += 1;
  }

  console.log(`[Sequence Engine] Processed ${processed} due enrollment(s)`);
  return { processed };
};
