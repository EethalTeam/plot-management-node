const mongoose = require("mongoose");

// One doc per lead's in-progress (or completed) run through a WhatsAppFlow —
// the "session" the engine reads/advances on every inbound message. At most
// one "active" state per lead is enforced in application code
// (services/whatsappFlowEngine.js checks before creating), not a DB
// constraint.
const whatsAppFlowStateSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    waid: { type: String, trim: true, required: true },
    flowId: { type: mongoose.Schema.Types.ObjectId, ref: "WhatsAppFlow", required: true },
    currentNodeId: { type: String, trim: true, required: true },
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    // "expired": the lead went silent past the timeout while a
    // question/buttons node was waiting on them — see
    // services/whatsappFlowEngine.js's isExpired(). Kept distinct from
    // "completed" so it's possible to tell "they finished the flow" apart
    // from "they abandoned it" if that's ever surfaced in the UI.
    status: { type: String, enum: ["active", "completed", "expired"], default: "active" },
  },
  { timestamps: true },
);

whatsAppFlowStateSchema.index({ leadId: 1, status: 1 });

module.exports = mongoose.model("WhatsAppFlowState", whatsAppFlowStateSchema);
