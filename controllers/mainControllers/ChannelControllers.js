const IndiaMartLead = require("../../models/masterModels/IndiaMartLead");
const JustdialLead = require("../../models/masterModels/JustdialLead");
const WhatsAppLead = require("../../models/masterModels/WhatsAppLead");
const WhatsAppInteraction = require("../../models/masterModels/WhatsAppInteraction");
const ChannelSetting = require("../../models/masterModels/ChannelSetting");
const KeywordTrigger = require("../../models/masterModels/KeywordTrigger");

const DEFAULT_WHATSAPP_TEMPLATE = "Hi {{name}}, thanks for reaching out! One of our team members will be with you shortly.";

// Instagram DM / LinkedIn InMail / Magicbricks Form have no backend of any
// kind — no OAuth app, no partner API access — so they're reported as
// permanently unavailable rather than faked as "connected."
exports.getChannelStatus = async (req, res) => {
  try {
    const whatsappConfigured = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    const phoneIdTail = process.env.WHATSAPP_PHONE_NUMBER_ID ? String(process.env.WHATSAPP_PHONE_NUMBER_ID).slice(-4) : null;

    const channels = [
      { id: "indiamart", accountHandle: "POST /api/Lead/indiamart-webhook", connected: true, available: true },
      { id: "justdial", accountHandle: "POST /api/Lead/justdial-webhook", connected: true, available: true },
      {
        id: "whatsapp",
        accountHandle: whatsappConfigured ? `Number ID •••• ${phoneIdTail}` : "Not configured",
        connected: whatsappConfigured,
        available: true,
      },
      { id: "instagram", accountHandle: "Needs Meta Graph API integration", connected: false, available: false },
      { id: "linkedin", accountHandle: "Needs LinkedIn API integration", connected: false, available: false },
      { id: "magicbricks", accountHandle: "Needs Magicbricks partner access", connected: false, available: false },
    ];

    res.status(200).json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Merges the three real per-channel log tables into one feed. IndiaMART and
// Justdial log every inquiry (matched or not); WhatsAppLead logs only
// brand-new contacts (existing contacts' further messages append to the
// Lead itself, not a new row here) — close enough to a unified "new capture
// event" feed without joining in the full WhatsAppInteraction transcript.
exports.getIngestionLog = async (req, res) => {
  try {
    const [indiamart, justdial, whatsapp] = await Promise.all([
      IndiaMartLead.find().sort({ createdAt: -1 }).limit(20),
      JustdialLead.find().sort({ createdAt: -1 }).limit(20),
      WhatsAppLead.find().sort({ createdAt: -1 }).limit(20),
    ]);

    const whatsappLeadIds = whatsapp.filter((w) => w.leadId).map((w) => w.leadId);
    const repliedLeadIds = whatsappLeadIds.length
      ? new Set(
          (await WhatsAppInteraction.find({ leadId: { $in: whatsappLeadIds }, direction: "outbound" }).distinct("leadId")).map(String),
        )
      : new Set();

    const entries = [
      ...indiamart.map((doc) => ({
        id: doc._id,
        channelId: "indiamart",
        leadName: doc.senderName || "Unknown",
        handle: doc.senderMobile || doc.normalizedPhone || "",
        site: doc.senderCity || "",
        message: doc.queryMessage || "",
        leadCreated: Boolean(doc.leadId),
        autoReplySent: false,
        timestamp: doc.createdAt,
      })),
      ...justdial.map((doc) => ({
        id: doc._id,
        channelId: "justdial",
        leadName: doc.name || "Unknown",
        handle: doc.mobile || doc.normalizedPhone || "",
        site: doc.city || "",
        message: doc.message || "",
        leadCreated: Boolean(doc.leadId),
        autoReplySent: false,
        timestamp: doc.createdAt,
      })),
      ...whatsapp.map((doc) => ({
        id: doc._id,
        channelId: "whatsapp",
        leadName: doc.senderName || "Unknown",
        handle: doc.senderMobile || doc.normalizedPhone || "",
        site: "",
        message: doc.queryMessage || "",
        leadCreated: Boolean(doc.leadId),
        autoReplySent: doc.leadId ? repliedLeadIds.has(String(doc.leadId)) : false,
        timestamp: doc.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 40);

    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Only WhatsApp has a real outbound send path — this always reports just
// that one channel's setting (created with a sensible default on first read).
exports.getAutoResponseSettings = async (req, res) => {
  try {
    let setting = await ChannelSetting.findOne({ channelId: "whatsapp" });
    if (!setting) {
      setting = await ChannelSetting.create({
        channelId: "whatsapp",
        autoResponseEnabled: process.env.WHATSAPP_AUTO_ACK_ENABLED === "true",
        autoResponseTemplate: DEFAULT_WHATSAPP_TEMPLATE,
      });
    }
    res.status(200).json({ success: true, data: { whatsapp: setting } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAutoResponseSetting = async (req, res) => {
  try {
    const { channelId, enabled, template } = req.body;
    if (channelId !== "whatsapp") {
      return res.status(400).json({ success: false, message: "Only the WhatsApp channel supports automated responses right now." });
    }

    const update = {};
    if (enabled !== undefined) update.autoResponseEnabled = enabled;
    if (template !== undefined) update.autoResponseTemplate = template;

    const setting = await ChannelSetting.findOneAndUpdate(
      { channelId: "whatsapp" },
      { $set: update, $setOnInsert: { channelId: "whatsapp" } },
      { new: true, upsert: true },
    );

    res.status(200).json({ success: true, message: "Auto-response updated", data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Real keyword -> auto-reply rules for inbound WhatsApp messages — matched
// in services/whatsappParser.js on every inbound message, not just settings
// CRUD with nothing behind it.
exports.getKeywordTriggers = async (req, res) => {
  try {
    const triggers = await KeywordTrigger.find().sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: triggers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createKeywordTrigger = async (req, res) => {
  try {
    const { keyword, template } = req.body;
    if (!keyword || !template) {
      return res.status(400).json({ success: false, message: "keyword and template are required" });
    }
    const trigger = await KeywordTrigger.create({ keyword, template, enabled: true });
    res.status(201).json({ success: true, message: "Keyword trigger created", data: trigger });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateKeywordTrigger = async (req, res) => {
  try {
    const { id, keyword, template, enabled } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "id is required" });

    const update = {};
    if (keyword !== undefined) update.keyword = keyword;
    if (template !== undefined) update.template = template;
    if (enabled !== undefined) update.enabled = enabled;

    const trigger = await KeywordTrigger.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!trigger) return res.status(404).json({ success: false, message: "Keyword trigger not found" });
    res.status(200).json({ success: true, message: "Keyword trigger updated", data: trigger });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteKeywordTrigger = async (req, res) => {
  try {
    const { id } = req.body;
    const trigger = await KeywordTrigger.findByIdAndDelete(id);
    if (!trigger) return res.status(404).json({ success: false, message: "Keyword trigger not found" });
    res.status(200).json({ success: true, message: "Keyword trigger removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
