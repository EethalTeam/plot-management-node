const EmailLog = require("../../models/masterModels/EmailLog");
const emailOutbox = require("../../services/emailOutbox");

function normalizeAddressList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter(Boolean);
  return value
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

exports.sendEmail = async (req, res) => {
  try {
    const { to, cc, subject, body, leadId, dealId, visitorId, sentById } = req.body;

    const toList = normalizeAddressList(to);
    if (toList.length === 0 || !subject) {
      return res.status(400).json({ success: false, message: "At least one recipient and a subject are required" });
    }
    const ccList = normalizeAddressList(cc);

    let status = "sent";
    let errorMessage;
    try {
      await emailOutbox.sendEmail({ to: toList, cc: ccList, subject, body });
    } catch (error) {
      status = "failed";
      errorMessage = error.message;
    }

    const log = await EmailLog.create({
      to: toList,
      cc: ccList,
      subject,
      body,
      status,
      errorMessage,
      leadId: leadId || undefined,
      dealId: dealId || undefined,
      visitorId: visitorId || undefined,
      sentById: sentById || undefined,
      sentAt: new Date(),
    });

    // Sending failed, but we still recorded the attempt — surface that as an
    // error response so the UI shows it wasn't actually delivered.
    if (status === "failed") {
      return res.status(502).json({ success: false, message: errorMessage, data: log });
    }

    res.status(201).json({ success: true, message: "Email sent", data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmailHistory = async (req, res) => {
  try {
    const { leadId, dealId, visitorId } = req.body;
    const query = {};
    if (leadId) query.leadId = leadId;
    if (dealId) query.dealId = dealId;
    if (visitorId) query.visitorId = visitorId;

    if (Object.keys(query).length === 0) {
      return res.status(400).json({ success: false, message: "leadId, dealId or visitorId is required" });
    }

    const logs = await EmailLog.find(query).sort({ sentAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
