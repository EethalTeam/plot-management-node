const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema({
  description: { type: String, trim: true },
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
});

const documentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  sizeKb: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

const dealSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    leadName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    // Real plot + visitor, once the deal is tied to a specific unit/buyer —
    // both optional early in the pipeline, but required for the "Create
    // Payment Plan" hand-off once a deal is Won (see DealControllers.js).
    plotId: { type: mongoose.Schema.Types.ObjectId, ref: "Plot" },
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor" },
    unit: { type: String, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    stageId: {
      type: String,
      enum: ["new", "proposal-sent", "negotiation", "won", "lost"],
      default: "new",
    },
    value: { type: Number, default: 0 },
    stageEnteredAt: { type: Date, default: Date.now },
    quotation: {
      lineItems: [lineItemSchema],
      taxRatePercent: { type: Number, default: 18 },
      notes: { type: String, trim: true },
      generatedAt: { type: Date },
    },
    documents: [documentSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Deal", dealSchema);
