const mongoose = require("mongoose");

// A saved branching chatbot definition — built entirely on Meta's WhatsApp
// Cloud API (interactive button messages + free-text capture), no external
// platform. See services/whatsappFlowEngine.js for the runtime that walks
// these nodes against real inbound messages.
const flowNodeSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["message", "buttons", "question", "end"],
      required: true,
    },
    text: { type: String, trim: true, default: "" },
    // type: "buttons" only — Meta allows at most 3 reply buttons per message.
    buttons: {
      type: [{ id: { type: String, trim: true }, title: { type: String, trim: true } }],
      default: undefined,
    },
    // type: "question" only — the inbound free-text reply is stored under this key.
    captureVariable: { type: String, trim: true },
    // type: "message" / "question" — nodeId of the next node.
    next: { type: String, trim: true },
    // type: "buttons" only — maps a tapped button's id to the next nodeId.
    branches: { type: Map, of: String, default: undefined },
  },
  { _id: false },
);

const whatsAppFlowSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    // Nested field is named "triggerType" (not "type") — Mongoose special-cases
    // a "type" key directly inside a path descriptor as the SchemaType itself,
    // which would otherwise make it try to resolve `trigger` down to a bare
    // String type instead of this nested shape.
    trigger: {
      triggerType: { type: String, enum: ["new_contact", "keyword"], required: true },
      keyword: { type: String, trim: true },
    },
    startNodeId: { type: String, required: true, trim: true },
    nodes: { type: [flowNodeSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WhatsAppFlow", whatsAppFlowSchema);
