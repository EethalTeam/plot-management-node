const crypto = require("crypto");

// Requires req.rawBody, populated by the express.json() `verify` callback in server.js
// for requests under /api/whatsapp/webhook.
const verifyWhatsAppSignature = (req, res, next) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error("WHATSAPP_APP_SECRET is not configured.");
    return res.status(500).json({
      success: false,
      message: "WhatsApp signature verification is not configured.",
    });
  }

  if (!req.rawBody) {
    console.error("Missing raw body for WhatsApp signature verification.");
    return res.status(400).json({
      success: false,
      message: "Missing raw body for signature verification.",
    });
  }

  const signatureHeader = req.get("x-hub-signature-256") || "";
  const [algo, receivedHash] = signatureHeader.split("=");

  if (algo !== "sha256" || !receivedHash) {
    return res.status(401).json({
      success: false,
      message: "Missing or malformed x-hub-signature-256 header.",
    });
  }

  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(req.rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(receivedHash, "utf8");
  const expectedBuffer = Buffer.from(expectedHash, "utf8");

  const isValid =
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

  if (!isValid) {
    console.error("WhatsApp webhook signature mismatch.");
    return res.status(401).json({
      success: false,
      message: "Invalid signature.",
    });
  }

  next();
};

module.exports = verifyWhatsAppSignature;
