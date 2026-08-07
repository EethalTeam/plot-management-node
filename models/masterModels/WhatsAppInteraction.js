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
    // Only meaningful for inbound messages — outbound ones are set read:true
    // at creation (see whatsappOutbox.js) since we sent them ourselves.
    // Powers the Inbox tab's unread badge (see WhatsAppController.js).
    read: {
      type: Boolean,
      default: false,
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
