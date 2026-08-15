const mongoose = require("mongoose");

// Singleton workspace-level security config — same "one real row, found or
// created on first read" pattern as ChannelSetting.js. ipRestrictionEnabled
// defaults false so simply creating this document (e.g. the settings panel
// loading for the first time) never changes current login behavior.
const securitySettingSchema = new mongoose.Schema(
  {
    ipRestrictionEnabled: { type: Boolean, default: false },
    // Each entry is either a plain IP ("203.0.113.5") or CIDR range
    // ("203.0.113.0/24") — see middlewares/authMiddleware.js's isIpAllowed.
    allowedIps: { type: [String], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SecuritySetting", securitySettingSchema);
