const { whatsappQueue } = require("../../queues/whatsappQueue");

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
