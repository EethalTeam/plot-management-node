const SecuritySetting = require("../../models/masterModels/SecuritySetting");

// Singleton settings document — same "find the one row, create it with
// defaults on first read" pattern as ChannelControllers.getAutoResponseSettings.
exports.getSecuritySettings = async (req, res) => {
  try {
    let setting = await SecuritySetting.findOne();
    if (!setting) {
      setting = await SecuritySetting.create({ ipRestrictionEnabled: false, allowedIps: [] });
    }
    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lets the settings UI show "your current IP is X" before an admin enables
// the restriction — the single biggest risk with this feature is an admin
// forgetting to allowlist their own IP and locking themselves out.
exports.getMyIp = (req, res) => {
  const ip = req.ip?.startsWith("::ffff:") ? req.ip.slice(7) : req.ip;
  res.status(200).json({ success: true, data: { ip } });
};

exports.updateSecuritySettings = async (req, res) => {
  try {
    const { ipRestrictionEnabled, allowedIps } = req.body;

    const update = {};
    if (ipRestrictionEnabled !== undefined) update.ipRestrictionEnabled = ipRestrictionEnabled;
    if (allowedIps !== undefined) update.allowedIps = allowedIps;

    const setting = await SecuritySetting.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true });

    res.status(200).json({ success: true, message: "Security settings updated", data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
