const mongoose = require("mongoose");

// One row per milestone/installment (e.g. "Booking Advance", "Agreement
// Installment", "Registration Balance") — plot sales don't follow a fixed
// EMI schedule, so this is a free-form list the rep defines per booking
// rather than an auto-generated fixed cadence.
const installmentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const paymentPlanSchema = new mongoose.Schema(
  {
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
    totalAmount: {
      type: Number,
      required: true,
    },
    installments: [installmentSchema],
    // Derived from installments on every write (see PaymentControllers.js
    // recomputePlanStatus) rather than set directly by callers.
    status: {
      type: String,
      enum: ["on-track", "overdue", "completed"],
      default: "on-track",
    },
    notes: { type: String, trim: true },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PaymentPlan", paymentPlanSchema);
