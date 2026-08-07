const mongoose = require("mongoose");

// Per-channel automated-response config. Only WhatsApp has real outbound
// send capability today (see services/whatsappOutbox.js) — IndiaMART and
// Justdial are inbound-only vendor webhooks with no programmatic reply path,
// so this collection is only ever expected to hold a "whatsapp" row.
const channelSettingSchema = new mongoose.Schema(
  {
    channelId: { type: String, required: true, unique: true, trim: true },
    autoResponseEnabled: { type: Boolean, default: false },
    autoResponseTemplate: { type: String, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ChannelSetting", channelSettingSchema);
