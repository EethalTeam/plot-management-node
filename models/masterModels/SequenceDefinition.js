const mongoose = require("mongoose");

// A real multi-step, delay-based WhatsApp nurture sequence. See
// services/sequenceEngine.js for the runtime that enrolls leads and sends
// each step for real via services/whatsappOutbox.js.
const sequenceStepSchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true, trim: true },
    delay: { type: String, enum: ["immediately", "1h", "1d", "3d", "7d"], default: "immediately" },
    // "text" only reliably sends inside Meta's 24h customer-service window —
    // realistically only true for an "immediately" first step sent right
    // after a fresh inbound message. Any step with a real delay needs a
    // pre-approved "template" instead, same rule as
    // controllers/mainControllers/WhatsAppReminderControllers.js.
    messageType: { type: String, enum: ["text", "template"], default: "text" },
    text: { type: String, trim: true, default: "" },
    templateName: { type: String, trim: true },
    templateLanguageCode: { type: String, trim: true, default: "en_US" },
  },
  { _id: false },
);

const sequenceDefinitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    // Object shape (not a bare string) mirrors WhatsAppFlow.trigger, ready
    // for more trigger types later (e.g. once a real site-visit-outcome
    // signal exists for a no-show trigger). Only "new_lead" is real today —
    // see services/sequenceEngine.js's tryEnrollNewLead.
    trigger: {
      triggerType: { type: String, enum: ["new_lead"], default: "new_lead" },
    },
    steps: { type: [sequenceStepSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SequenceDefinition", sequenceDefinitionSchema);
