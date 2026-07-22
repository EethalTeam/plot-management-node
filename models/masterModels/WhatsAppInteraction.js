const mongoose = require("mongoose");

const WhatsAppInteractionSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      default: "inbound",
    },
    message_body: {
      type: String,
      trim: true,
    },
    whatsapp_msg_id: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    waid: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["received", "duplicate", "failed"],
      default: "received",
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

const WhatsAppInteraction = mongoose.model(
  "WhatsAppInteraction",
  WhatsAppInteractionSchema,
);
module.exports = WhatsAppInteraction;
