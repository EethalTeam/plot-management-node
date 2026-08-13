const Lead = require("../models/masterModels/Leads");
const WhatsAppInteraction = require("../models/masterModels/WhatsAppInteraction");
const WhatsAppLead = require("../models/masterModels/WhatsAppLead");
const ChannelSetting = require("../models/masterModels/ChannelSetting");
const KeywordTrigger = require("../models/masterModels/KeywordTrigger");
const { autoAssignLead } = require("./leadDistribution");
const whatsappFlowEngine = require("./whatsappFlowEngine");
const sequenceEngine = require("./sequenceEngine");
const optInHandler = require("./optInHandler");
const { getIo } = require("../utils/socketRegistry");
const { sendTextMessage } = require("./whatsappOutbox");
const redisClient = require("../utils/redisClient");

const TRAILING_DIGITS = 10;
const AUTO_ACK_LOCK_TTL_SECONDS = 300;
const DEFAULT_AUTO_ACK_TEMPLATE = "Hi {{name}}, thanks for reaching out! One of our team members will be with you shortly.";

const extractMessageBody = (message) => {
  switch (message.type) {
    case "text":
      return message.text?.body || "";
    case "button":
      return message.button?.text || "";
    case "interactive":
      return (
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        ""
      );
    default:
      return `[${message.type} message]`;
  }
};

// Match on whatsapp_waid first; fall back to a trailing-digits match against
// leadPhone so leads created via other channels (Excel import, IndiaMART, etc.)
// still get linked correctly.
const findLeadByWaid = async (waid) => {
  const byWaid = await Lead.findOne({ whatsapp_waid: waid });
  if (byWaid) {
    return byWaid;
  }

  const trailingDigits = waid.slice(-TRAILING_DIGITS);
  return Lead.findOne({
    leadPhone: new RegExp(`${trailingDigits}$`),
  });
};

const upsertLeadFromMessage = async ({ waid, profileName, messageBody }) => {
  const existingLead = await findLeadByWaid(waid);

  if (existingLead) {
    const update = {
      $push: {
        leadMessages: { text: messageBody, source: "WhatsApp" },
      },
    };
    if (!existingLead.whatsapp_waid) {
      update.$set = { whatsapp_waid: waid };
    }

    const lead = await Lead.findByIdAndUpdate(existingLead._id, update, {
      new: true,
    });
    return { lead, isNewLead: false };
  }

  const [leadFirstName, ...rest] = (profileName || "WhatsApp Lead").split(" ");

  const lead = await Lead.create({
    leadFirstName: leadFirstName || "WhatsApp Lead",
    leadLastName: rest.join(" "),
    leadPhone: waid,
    whatsapp_waid: waid,
    leadExternalSource: "WhatsApp",
    leadMessages: [{ text: messageBody, source: "WhatsApp" }],
    leadHistory: [
      {
        eventType: "Lead Created",
        details: "Created automatically from an inbound WhatsApp message.",
      },
    ],
  });

  await autoAssignLead(lead, { sourceLabel: "WhatsApp", io: getIo() });
  await sequenceEngine.tryEnrollNewLead(lead);

  return { lead, isNewLead: true };
};

// Streams the new message straight to any connected UI: a global feed for
// dashboards/unassigned inbox views, plus the assigned employee's personal
// room (joined via "joinRoom" in server.js) if the lead already has an owner.
const emitRealtimeUpdate = ({ lead, interaction, isNewLead }) => {
  const io = getIo();
  if (!io) {
    return;
  }

  const payload = { lead, interaction, isNewLead };

  io.emit("whatsapp:message", payload);

  if (lead.leadAssignedId) {
    io.to(lead.leadAssignedId.toString()).emit("whatsapp:message", payload);
  }
};

// Only fires for brand-new leads, immediately after their first inbound
// message — safely inside Meta's 24h customer-service window. Gated behind
// WHATSAPP_AUTO_ACK_ENABLED so deploying this code doesn't silently start
// auto-replying until it's explicitly turned on for an environment.
const sendAutoAcknowledgment = async ({ lead, waid }) => {
  // The Channels page toggle writes here (see ChannelControllers.js) — the
  // env var is only the fallback for before that setting has ever been
  // saved, so flipping the switch in the UI takes effect immediately without
  // a redeploy.
  const setting = await ChannelSetting.findOne({ channelId: "whatsapp" });
  const enabled = setting ? setting.autoResponseEnabled : process.env.WHATSAPP_AUTO_ACK_ENABLED === "true";
  if (!enabled) {
    return;
  }
  const template = setting?.autoResponseTemplate || DEFAULT_AUTO_ACK_TEMPLATE;

  // Guards against double-sends when Meta bundles multiple messages from the
  // same brand-new contact into one webhook payload (or two workers race).
  // NX makes the SET a no-op if the lock is already held; the wrapper
  // returns null both then and if Redis is unreachable, so this fails safe
  // by skipping the ack rather than risking a duplicate.
  const lockKey = `whatsapp:ack_lock:${lead._id}`;

  try {
    const acquiredLock = await redisClient.set(lockKey, "locked", {
      EX: AUTO_ACK_LOCK_TTL_SECONDS,
      NX: true,
    });

    if (!acquiredLock) {
      console.log(
        `Auto-acknowledgment skipped (already dispatched or in-flight) for lead ${lead._id}`,
      );
      return;
    }

    await sendTextMessage({
      leadId: lead._id,
      waid,
      text: template.replace(/\{\{\s*name\s*\}\}/gi, lead.leadFirstName || "there"),
    });
    console.log(`Auto-acknowledgment sent to new WhatsApp lead: ${waid}`);
  } catch (error) {
    // Lead and interaction are already saved; a failed ack shouldn't fail the job.
    console.error(
      `Failed to send auto-acknowledgment to ${waid}:`,
      error.message,
    );
    // Release the lock on hard failure so a future retry isn't blocked by it.
    await redisClient.del(lockKey).catch(() => {});
  }
};

// Runs on EVERY inbound message (new or returning contact), unlike
// sendAutoAcknowledgment which only ever fires once for a brand-new lead's
// first message. First enabled rule whose keyword appears anywhere in the
// message (case-insensitive substring match) wins. Returns whether a reply
// was sent, so callers can skip the generic new-contact greeting when a
// keyword already answered it — avoids sending two messages back to back.
const sendKeywordTriggerReply = async ({ lead, waid, messageBody }) => {
  const normalizedBody = (messageBody || "").toLowerCase().trim();
  if (!normalizedBody) return false;

  const triggers = await KeywordTrigger.find({ enabled: true });
  const match = triggers.find((t) => normalizedBody.includes(t.keyword.toLowerCase()));
  if (!match) return false;

  try {
    await sendTextMessage({
      leadId: lead._id,
      waid,
      text: match.template.replace(/\{\{\s*name\s*\}\}/gi, lead.leadFirstName || "there"),
    });
    console.log(`Keyword-triggered reply ("${match.keyword}") sent to ${waid}`);
    return true;
  } catch (error) {
    console.error(`Failed to send keyword-triggered reply to ${waid}:`, error.message);
    return false;
  }
};

const processInboundMessage = async (message, profileName, rawValue) => {
  const whatsappMsgId = message.id;
  const waid = message.from;

  // Provider-retry deduplication
  const existingInteraction = await WhatsAppInteraction.findOne({
    whatsapp_msg_id: whatsappMsgId,
  });
  if (existingInteraction) {
    console.log(`Duplicate WhatsApp webhook ignored for msg id: ${whatsappMsgId}`);
    return existingInteraction;
  }

  const messageBody = extractMessageBody(message);
  const { lead, isNewLead } = await upsertLeadFromMessage({
    waid,
    profileName,
    messageBody,
  });

  // Whether this is the lead's first-ever WhatsApp message — not the same as
  // isNewLead: a lead created via IndiaMART/Justdial/manual entry can still
  // be messaging on WhatsApp for the first time. This is the real signal
  // flow triggers use (see whatsappFlowEngine.js's tryStartFlow) to avoid
  // re-running a first-touch flow on a lead who's already mid-conversation.
  // Computed before creating this message's own interaction row so the
  // count doesn't include itself.
  const isFirstWhatsAppMessage = (await WhatsAppInteraction.countDocuments({ leadId: lead._id })) === 0;

  const interaction = await WhatsAppInteraction.create({
    leadId: lead._id,
    direction: "inbound",
    message_body: messageBody,
    whatsapp_msg_id: whatsappMsgId,
    waid,
    status: "received",
    rawPayload: rawValue,
  });

  emitRealtimeUpdate({ lead, interaction, isNewLead });

  // Opt-out/opt-in intent is checked before anything else — a "STOP" must
  // never also be fed into an active flow/sequence as if it were a normal
  // reply, and no other automated message should go out once it's handled.
  const optStatusHandled = await optInHandler.handleOptStatusMessage({ lead, waid, messageBody });
  if (optStatusHandled) {
    return interaction;
  }

  // A WhatsAppFlow session takes priority over everything below: continuing
  // a conversation the lead is already mid-way through beats a generic
  // keyword reply, and a matching new-flow trigger beats the plain
  // single-message keyword-trigger/auto-ack path.
  let flowHandled = await whatsappFlowEngine.advanceFlow({ lead, waid, message, messageBody });
  if (!flowHandled) {
    flowHandled = await whatsappFlowEngine.tryStartFlow({ lead, waid, messageBody, isFirstWhatsAppMessage });
  }

  // Keyword replies take priority over the generic new-contact greeting so a
  // brand-new lead who opens with "what's the price?" gets the price answer,
  // not the price answer AND a separate "thanks for reaching out" message.
  const keywordReplySent = flowHandled || (await sendKeywordTriggerReply({ lead, waid, messageBody }));

  if (isNewLead) {
    // Reporting-parity table: one row per acquisition event, same as
    // IndiaMartLead/JustdialLead — not one row per message. Follow-up
    // messages are tracked in WhatsAppInteraction (above, unconditional)
    // and appended to lead.leadMessages, but don't get their own
    // WhatsAppLead row.
    await WhatsAppLead.create({
      externalQueryId: whatsappMsgId,
      leadId: lead._id,
      senderName: profileName || "",
      senderMobile: waid,
      normalizedPhone: waid,
      queryMessage: messageBody,
      source: "WhatsApp",
      status: "received",
      rawPayload: rawValue,
    });

    if (!keywordReplySent) {
      await sendAutoAcknowledgment({ lead, waid });
    }
  }

  return interaction;
};

// Entry point invoked by queues/whatsappWorker.js for job "process-whatsapp-event".
// Payload shape: Meta webhook body -> entry[].changes[].value.{messages,contacts,statuses}
exports.processWebhookEvent = async (payload) => {
  const entries = payload?.entry || [];

  for (const entry of entries) {
    const changes = entry?.changes || [];

    for (const change of changes) {
      const value = change?.value || {};
      const messages = value.messages || [];

      if (!messages.length) {
        // Delivery/read status callbacks or other non-message changes: nothing to extract.
        continue;
      }

      const profileName = (value.contacts || [])[0]?.profile?.name || "";

      for (const message of messages) {
        await processInboundMessage(message, profileName, value);
      }
    }
  }
};
