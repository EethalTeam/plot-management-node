const Lead = require("../../models/masterModels/Leads");
const whatsappOutbox = require("../../services/whatsappOutbox");

// These must be pre-approved Meta message templates (Business Manager ->
// WhatsApp Manager -> Message Templates) before sends will actually succeed —
// Meta rejects template messages that reference an unapproved/unknown name.
// Override via env once real templates are approved; the defaults below are
// placeholders describing what each template should say.
const CONFIRMATION_TEMPLATE = process.env.WHATSAPP_SITE_VISIT_CONFIRMATION_TEMPLATE || "site_visit_confirmation";
const DAY_BEFORE_TEMPLATE = process.env.WHATSAPP_SITE_VISIT_REMINDER_24H_TEMPLATE || "site_visit_reminder_24h";
const HOURS_BEFORE_TEMPLATE = process.env.WHATSAPP_SITE_VISIT_REMINDER_2H_TEMPLATE || "site_visit_reminder_2h";

const HOUR_MS = 60 * 60 * 1000;

function digitsOnly(value) {
  return (value || "").replace(/\D/g, "");
}

function resolveWaid(lead) {
  return lead.whatsapp_waid || digitsOnly(lead.leadPhone);
}

function formatVisitDate(date) {
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatVisitTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

async function sendVisitTemplate({ lead, templateName, siteName }) {
  const waid = resolveWaid(lead);
  if (!waid) return null;

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: lead.leadFirstName || "there" },
        { type: "text", text: siteName || "the site" },
        { type: "text", text: formatVisitDate(lead.SiteVisitDate) },
        { type: "text", text: formatVisitTime(lead.SiteVisitDate) },
      ],
    },
  ];

  return whatsappOutbox.sendTemplateMessage({
    waid,
    templateName,
    components,
    leadId: lead._id,
  });
}

// Runs on a short interval (see queues/scheduledJobs.js). For every lead with
// an upcoming SiteVisitDate, sends at most one of each: a confirmation (first
// time the job sees the visit), a ~24h-before reminder, and a ~2h-before
// reminder — tracked on lead.siteVisitReminders so re-running the job never
// double-sends. Rescheduling the visit (SiteVisitDate changes) resets all
// three so the new date gets its own confirmation/reminders.
exports.processSiteVisitReminders = async () => {
  const now = Date.now();
  const summary = { confirmation: 0, dayBefore: 0, hoursBefore: 0, failed: 0, skippedNoWaid: 0 };

  const leads = await Lead.find({
    SiteVisitDate: { $gte: new Date(now - HOUR_MS), $lte: new Date(now + 26 * HOUR_MS) },
    opt_in_status: { $ne: "opted_out" },
  }).populate("leadSiteId", "sitename");

  for (const lead of leads) {
    const visitTime = new Date(lead.SiteVisitDate).getTime();
    const hoursUntilVisit = (visitTime - now) / HOUR_MS;
    const siteName = lead.leadSiteId?.sitename;

    if (!resolveWaid(lead)) {
      summary.skippedNoWaid += 1;
      continue;
    }

    if (!lead.siteVisitReminders || lead.siteVisitReminders.forDate?.getTime() !== visitTime) {
      lead.siteVisitReminders = { forDate: lead.SiteVisitDate };
    }
    const reminders = lead.siteVisitReminders;

    try {
      if (!reminders.confirmationSentAt && hoursUntilVisit > 0) {
        await sendVisitTemplate({ lead, templateName: CONFIRMATION_TEMPLATE, siteName });
        reminders.confirmationSentAt = new Date();
        summary.confirmation += 1;
      }
      if (!reminders.dayBeforeSentAt && hoursUntilVisit <= 24 && hoursUntilVisit > 2) {
        await sendVisitTemplate({ lead, templateName: DAY_BEFORE_TEMPLATE, siteName });
        reminders.dayBeforeSentAt = new Date();
        summary.dayBefore += 1;
      }
      if (!reminders.hoursBeforeSentAt && hoursUntilVisit <= 2 && hoursUntilVisit > 0) {
        await sendVisitTemplate({ lead, templateName: HOURS_BEFORE_TEMPLATE, siteName });
        reminders.hoursBeforeSentAt = new Date();
        summary.hoursBefore += 1;
      }

      lead.markModified("siteVisitReminders");
      await lead.save();
    } catch (error) {
      summary.failed += 1;
      console.error(`[WhatsApp Reminder] Failed for lead ${lead._id}:`, error.message);
    }
  }

  console.log(
    `[WhatsApp Reminder] confirmation=${summary.confirmation} dayBefore=${summary.dayBefore} hoursBefore=${summary.hoursBefore} failed=${summary.failed} skippedNoWaid=${summary.skippedNoWaid}`,
  );
  return summary;
};
