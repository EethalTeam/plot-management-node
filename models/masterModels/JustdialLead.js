const mongoose = require("mongoose");

const JustdialLeadSchema = new mongoose.Schema(
  {
    externalQueryId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    name: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    normalizedPhone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: "Justdial",
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

const JustdialLead = mongoose.model("JustdialLead", JustdialLeadSchema);
module.exports = JustdialLead;
