const WhatsAppInteraction = require("../models/masterModels/WhatsAppInteraction");

const GRAPH_API_VERSION = "v20.0";

const graphUrl = () =>
  `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

const sendToGraphApi = async (body) => {
  const token = process.env.WHATSAPP_TOKEN;

  if (!token || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be configured to send WhatsApp messages.",
    );
  }

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
    const error = new Error(
      result?.error?.message || "WhatsApp API request failed",
    );
    error.details = result;
    throw error;
  }

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
    rawPayload,
  });
};

// Free-form text reply. Meta only accepts this inside the 24h customer-service
// window opened by the customer's last inbound message; use sendTemplateMessage
// once that window has closed.
exports.sendTextMessage = async ({ waid, text, leadId = null }) => {
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
