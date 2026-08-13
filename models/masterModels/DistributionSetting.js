const mongoose = require("mongoose");

// Singleton document (only one ever expected to exist) holding the real
// round-robin rotation — replaces what was previously an in-memory-only
// frontend mock with no backend counterpart at all.
const distributionSettingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    rotationOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
    nextUpIndex: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DistributionSetting", distributionSettingSchema);
