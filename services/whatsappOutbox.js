const WhatsAppInteraction = require("../models/masterModels/WhatsAppInteraction");

const GRAPH_API_VERSION = "v20.0";

const graphUrl = () =>
  `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

const sendToGraphApi = async (body) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    const missingVars = [];
    if (!token) missingVars.push("WHATSAPP_TOKEN");
    if (!phoneNumberId) missingVars.push("WHATSAPP_PHONE_NUMBER_ID");
    throw new Error(
      `Missing environment variables: ${missingVars.join(", ")}. Cannot send WhatsApp messages.`,
    );
  }

  console.log(`[WhatsApp] Sending to ${body.to} via phone number ${phoneNumberId}`);

  const response = await fetch(graphUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.error?.message || "WhatsApp API request failed";
    const errorCode = result?.error?.code;
    const errorType = result?.error?.type;
    
    console.error(`[WhatsApp] API Error:`, {
      code: errorCode,
      type: errorType,
      message: errorMessage,
      details: result?.error,
      phoneNumberId,
      recipientNumber: body.to,
    });

    const error = new Error(errorMessage);
    error.details = result;
    error.code = errorCode;
    throw error;
  }

  console.log(`[WhatsApp] Message sent successfully:`, result?.messages?.[0]?.id);
  return result;
};

const logOutboundInteraction = async ({
  leadId,
  waid,
  messageBody,
  whatsappMsgId,
  rawPayload,
}) => {
  return WhatsAppInteraction.create({
    leadId: leadId || null,
    direction: "outbound",
    message_body: messageBody,
    whatsapp_msg_id: whatsappMsgId,
    waid,
    status: "received",
    read: true,
    rawPayload,
  });
};

// Free-form text reply. Meta only accepts this inside the 24h customer-service
// window opened by the customer's last inbound message; use sendTemplateMessage
// once that window has closed.
exports.sendTextMessage = async ({ waid, text, leadId = null }) => {
  if (!waid) {
    throw new Error("WAID (WhatsApp ID) is required to send a message");
  }

  console.log(`[WhatsApp] Sending text message to lead ${leadId || "unknown"} (WAID: ${waid})`);
  
  try {
    const result = await sendToGraphApi({
      messaging_product: "whatsapp",
      to: waid,
      type: "text",
      text: { body: text },
    });

    return logOutboundInteraction({
      leadId,
      waid,
      messageBody: text,
      whatsappMsgId: result?.messages?.[0]?.id,
      rawPayload: result,
    });
  } catch (error) {
    console.error(`[WhatsApp] Failed to send text message to ${waid}:`, error.message);
    throw error;
  }
};

// Interactive reply-button message — up to 3 tappable options. Like
// sendTextMessage, only works inside the 24h customer-service window. Powers
// WhatsAppFlow "buttons" nodes (see services/whatsappFlowEngine.js).
exports.sendInteractiveMessage = async ({ waid, bodyText, buttons, leadId = null }) => {
  const result = await sendToGraphApi({
    messaging_product: "whatsapp",
    to: waid,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((button) => ({
          type: "reply",
          reply: { id: button.id, title: button.title },
        })),
      },
    },
  });

  return logOutboundInteraction({
    leadId,
    waid,
    messageBody: bodyText,
    whatsappMsgId: result?.messages?.[0]?.id,
    rawPayload: result,
  });
};

// Pre-approved template message — the only message type Meta allows outside
// the 24h window. This is the entry point for future auto-acknowledgments
// (e.g. firing a "we received your enquiry" template on first inbound contact).
exports.sendTemplateMessage = async ({
  waid,
  templateName,
  languageCode = "en_US",
  components = [],
  leadId = null,
}) => {
  const result = await sendToGraphApi({
    messaging_product: "whatsapp",
    to: waid,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });

  return logOutboundInteraction({
    leadId,
    waid,
    messageBody: `[template:${templateName}]`,
    whatsappMsgId: result?.messages?.[0]?.id,
    rawPayload: result,
  });
};
