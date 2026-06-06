const nodemailer = require('nodemailer');

/**
 * Returns a configured transporter, or null when SMTP is not set up.
 * When null, callers fall back to logging the email to the console so
 * the app remains fully runnable without real mail credentials.
 */
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Send an email. Accepts optional attachments [{ filename, content }].
 * Falls back to console logging when SMTP is not configured.
 */
async function sendEmail({ to, subject, text, html, attachments }) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || 'VENDOR BRIDGE <no-reply@vendorbridge.com>';

  if (!transporter) {
    console.log('\n📧  [Email simulated - SMTP not configured]');
    console.log(`    To: ${to}`);
    console.log(`    Subject: ${subject}`);
    if (text) console.log(`    Body: ${text}`);
    if (attachments && attachments.length) {
      console.log(`    Attachments: ${attachments.map((a) => a.filename).join(', ')}`);
    }
    console.log('');
    return { simulated: true };
  }

  const info = await transporter.sendMail({ from, to, subject, text, html, attachments });
  return { simulated: false, messageId: info.messageId };
}

module.exports = { sendEmail };
