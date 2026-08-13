const mongoose = require("mongoose");

// Keyword -> auto-reply rules for inbound WhatsApp messages. See
// services/whatsappParser.js's sendKeywordTriggerReply for the matcher —
// this is a real automation, not a settings-only mock: an inbound message
// containing `keyword` (case-insensitive substring match) gets `template`
// sent back automatically.
const keywordTriggerSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true, trim: true },
    template: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("KeywordTrigger", keywordTriggerSchema);
