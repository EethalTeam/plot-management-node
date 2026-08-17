const { whatsappQueue } = require("../../queues/whatsappQueue");
const Lead = require("../../models/masterModels/Leads");
const WhatsAppInteraction = require("../../models/masterModels/WhatsAppInteraction");
const { sendTextMessage } = require("../../services/whatsappOutbox");

// --- WEBHOOK VERIFICATION (Meta calls this once when the webhook URL is configured) ---
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const verifyToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    verifyToken === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    console.log("WhatsApp webhook verified successfully.");
    return res.status(200).send(challenge);
  }

  console.error("WhatsApp webhook verification failed.");
  return res.sendStatus(403);
};

// --- WEBHOOK EVENT INGRESS: ack immediately, process asynchronously ---
exports.handleWebhookEvent = async (req, res) => {
  res.sendStatus(200);

  try {
    await whatsappQueue.add("process-whatsapp-event", req.body, {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
    });
  } catch (error) {
    console.error("Failed to enqueue WhatsApp webhook event:", error.message);
  }
};

// --- INBOX: real conversation list + thread view + send, backing the
// "WhatsApp" tab on the Calls & WhatsApp page (separate from the Workflows
// tab's keyword triggers) ---

// One row per lead with at least one WhatsApp message — most recent message
// as the preview, plus a real unread count (inbound + not yet opened).
exports.getThreads = async (req, res) => {
  try {
    const grouped = await WhatsAppInteraction.aggregate([
      { $match: { leadId: { $ne: null } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$leadId",
          lastMessage: { $first: "$message_body" },
          lastDirection: { $first: "$direction" },
          lastTimestamp: { $first: "$createdAt" },
          waid: { $first: "$waid" },
          unreadCount: {
            $sum: { $cond: [{ $and: [{ $eq: ["$direction", "inbound"] }, { $eq: ["$read", false] }] }, 1, 0] },
          },
        },
      },
      { $sort: { lastTimestamp: -1 } },
      { $limit: 100 },
    ]);

    const leadIds = grouped.map((g) => g._id);
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select("leadFirstName leadLastName leadPhone leadSourceId whatsapp_waid")
      .populate("leadSourceId", "leadSourceName")
      .lean();
    const leadMap = new Map(leads.map((l) => [String(l._id), l]));

    const threads = grouped
      .map((g) => {
        const lead = leadMap.get(String(g._id));
        if (!lead) return null;
        return {
          leadId: g._id,
          name: `${lead.leadFirstName ?? ""} ${lead.leadLastName ?? ""}`.trim() || "Unknown",
          phone: lead.leadPhone || g.waid || "",
          sourceName: lead.leadSourceId?.leadSourceName ?? null,
          lastMessage: { text: g.lastMessage ?? "", from: g.lastDirection === "outbound" ? "rep" : "lead", timestamp: g.lastTimestamp },
          unreadCount: g.unreadCount,
        };
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data: threads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Full message history for one lead's thread — also marks its inbound
// messages read, same as opening a conversation in any real inbox.
exports.getThreadMessages = async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ success: false, message: "leadId is required" });

    const messages = await WhatsAppInteraction.find({ leadId }).sort({ createdAt: 1 });
    await WhatsAppInteraction.updateMany({ leadId, direction: "inbound", read: false }, { $set: { read: true } });

    res.status(200).json({
      success: true,
      data: messages.map((m) => ({
        id: m._id,
        from: m.direction === "outbound" ? "rep" : "lead",
        text: m.message_body,
        timestamp: m.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Real send from the Inbox composer — same sendTextMessage the auto-ack and
// keyword triggers use, so it's still subject to Meta's real 24h freeform
// messaging window.
exports.sendMessage = async (req, res) => {
  try {
    const { leadId, text } = req.body;
    if (!leadId || !text) return res.status(400).json({ success: false, message: "leadId and text are required" });

    console.log(`[WhatsApp] Sending message from inbox for lead: ${leadId}`);

    const lead = await Lead.findById(leadId).select("whatsapp_waid leadPhone leadFirstName leadLastName");
    if (!lead) {
      console.error(`[WhatsApp] Lead not found: ${leadId}`);
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const waid = lead.whatsapp_waid || lead.leadPhone;
    if (!waid) {
      console.error(`[WhatsApp] No WhatsApp ID found for lead ${leadId}. whatsapp_waid: ${lead.whatsapp_waid}, leadPhone: ${lead.leadPhone}`);
      return res.status(400).json({ 
        success: false, 
        message: "This lead has no WhatsApp number on file. Please add a phone number to the lead's profile." 
      });
    }

    console.log(`[WhatsApp] Using WAID: ${waid} for lead ${lead.leadFirstName} ${lead.leadLastName}`);

    try {
      const interaction = await sendTextMessage({ waid, text, leadId: lead._id });
      console.log(`[WhatsApp] Message sent successfully. Message ID: ${interaction._id}`);
      
      res.status(200).json({
        success: true,
        data: { id: interaction._id, from: "rep", text: interaction.message_body, timestamp: interaction.createdAt },
      });
    } catch (sendError) {
      console.error(`[WhatsApp] Error sending message via Meta API:`, sendError.message);
      
      // Check for common error codes
      if (sendError.code === 131000) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot send this message — outside the 24-hour messaging window. Use a template message instead." 
        });
      }
      
      if (sendError.code === 131047) {
        return res.status(400).json({ 
          success: false, 
          message: "This phone number is not registered with WhatsApp. Check the number format (must be E.164: e.g., 919876543210)." 
        });
      }

      throw sendError;
    }
  } catch (error) {
    console.error(`[WhatsApp] sendMessage error:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};
