const mongoose = require("mongoose");

// Centralized cross-entity activity/audit log. Previously this schema was
// copy-pasted from an unrelated inventory/order system (childProductId,
// orderCode, a "Customer" ref that doesn't exist in this codebase, etc.) and
// nothing ever wrote to it — rebuilt to match this CRM's real entities.
const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

    module: {
      type: String,
      required: true,
      enum: ["Lead", "Deal", "Payment", "Meeting", "Plot"],
    },
    action: { type: String, required: true, trim: true },

    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityLabel: { type: String, trim: true },

    changeField: { type: String, trim: true },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,

    description: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ entityId: 1 });
activityLogSchema.index({ actorId: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
