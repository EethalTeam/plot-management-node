const mongoose = require("mongoose");

const IndiaMartLeadSchema = new mongoose.Schema(
  {
    externalQueryId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    senderName: {
      type: String,
      trim: true,
    },
    senderMobile: {
      type: String,
      trim: true,
    },
    normalizedPhone: {
      type: String,
      trim: true,
    },
    senderEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    queryMessage: {
      type: String,
      trim: true,
    },
    senderCity: {
      type: String,
      trim: true,
    },
    senderState: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: "IndiaMART",
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
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const IndiaMartLead = mongoose.model("IndiaMartLead", IndiaMartLeadSchema);
module.exports = IndiaMartLead;
