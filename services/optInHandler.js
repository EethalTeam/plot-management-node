const WhatsAppFlowState = require("../models/masterModels/WhatsAppFlowState");
const SequenceEnrollment = require("../models/masterModels/SequenceEnrollment");
const { sendTextMessage } = require("./whatsappOutbox");

// Whole-word match, not substring — "stop" as a bare word opts someone out,
// but "let's stop by the site Saturday" must not. Compliance-sensitive, so
// this errs tighter than the plain substring match used by KeywordTrigger.
const OPT_OUT_PATTERNS = [/\bstop\b/i, /\bunsubscribe\b/i, /\bopt\s*out\b/i, /don'?t message me/i, /remove me from/i];
const OPT_IN_PATTERNS = [/\bstart\b/i, /\bresubscribe\b/i, /\bsubscribe\b/i];

const OPT_OUT_CONFIRMATION =
  "You've been unsubscribed and won't receive further automated messages from us. Reply START to resubscribe.";
const OPT_IN_CONFIRMATION = "You're resubscribed — you'll receive messages from us again.";

function matches(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

// Ends every in-progress automated conversation the lead is in — belt and
// braces alongside the opt_in_status checks inside whatsappFlowEngine.js /
// sequenceEngine.js, since a WhatsApp opt-out is a compliance requirement,
// not just a UX nicety, and is worth defending in more than one place.
async function haltAutomation(leadId) {
  await WhatsAppFlowState.updateMany({ leadId, status: "active" }, { status: "completed" });
  await SequenceEnrollment.updateMany({ leadId, status: "active" }, { status: "cancelled", nextSendAt: null });
}

// Checked first, ahead of the flow engine / keyword triggers / auto-ack, so
// an opt-out or opt-in message is never also fed into an active
// conversation. Returns true when it handled the message (caller should
// skip all other automated-reply logic for this turn).
exports.handleOptStatusMessage = async ({ lead, waid, messageBody }) => {
  const text = (messageBody || "").trim();
  if (!text) return false;

  if (matches(OPT_OUT_PATTERNS, text)) {
    if (lead.opt_in_status !== "opted_out") {
      lead.opt_in_status = "opted_out";
      await lead.save();
    }
    await haltAutomation(lead._id);
    try {
      await sendTextMessage({ waid, leadId: lead._id, text: OPT_OUT_CONFIRMATION });
    } catch (error) {
      console.error("Opt-out confirmation send failed:", error.message);
    }
    return true;
  }

  if (lead.opt_in_status === "opted_out" && matches(OPT_IN_PATTERNS, text)) {
    lead.opt_in_status = "opted_in";
    await lead.save();
    try {
      await sendTextMessage({ waid, leadId: lead._id, text: OPT_IN_CONFIRMATION });
    } catch (error) {
      console.error("Opt-in confirmation send failed:", error.message);
    }
    return true;
  }

  return false;
};
