const nodemailer = require("nodemailer");

let cachedTransport = null;

// Provider-agnostic SMTP (works with Gmail, SendGrid, AWS SES, Postmark,
// Office365, etc. — whichever the workspace ends up configuring) rather than
// hard-coding one vendor's API, matching how WHATSAPP_TOKEN/PHONE_NUMBER_ID
// and the backup Google Drive creds are just env vars someone sets later.
function getTransport() {
  if (cachedTransport) return cachedTransport;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP_HOST, SMTP_USER and SMTP_PASS must be configured in the environment to send email.",
    );
  }

  const port = Number(SMTP_PORT) || 587;
  cachedTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return cachedTransport;
}

exports.sendEmail = async ({ to, cc, subject, body }) => {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  return transport.sendMail({
    from,
    to,
    cc: cc && cc.length ? cc : undefined,
    subject,
    text: body,
    html: body ? body.replace(/\n/g, "<br/>") : undefined,
  });
};
