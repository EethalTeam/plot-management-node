const mongoose = require("mongoose");

// Actual recorded receipts against a PaymentPlan. Kept separate from the
// plan's installments so a plan's history survives even if installments are
// later edited, and so partial/overpayments and unscheduled payments all
// have a real record rather than only a mutated running total.
const paymentTransactionSchema = new mongoose.Schema(
  {
    paymentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentPlan",
      required: true,
    },
    installmentId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plot",
      required: true,
    },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visitor",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "cheque", "bank-transfer", "upi", "card", "other"],
      default: "bank-transfer",
    },
    referenceNumber: { type: String, trim: true },
    receiptNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
