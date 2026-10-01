const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transporter;
}

/**
 * Sends the verification email. The link contains the RAW token.
 * If SMTP isn't configured (dev), the link is printed to the console instead.
 */
async function sendVerificationEmail(user, rawToken) {
  const link = `${config.clientUrl}/verify-email?token=${rawToken}`;

  if (!config.email.host) {
    console.log(`\n[DEV] SMTP not configured. Verification link for ${user.email}:\n${link}\n`);
    return;
  }

  await getTransporter().sendMail({
    from: config.email.from,
    to: user.email,
    subject: 'Verify your EventHorizon account',
    text: `Hi ${user.name},\n\nConfirm your email by opening this link (valid for ${config.verificationTtlHours} hours):\n${link}\n\nIf you didn't sign up, ignore this email.`,
    html: `<p>Hi ${user.name},</p>
<p>Confirm your email by clicking the button below (valid for ${config.verificationTtlHours} hours):</p>
<p><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Verify email</a></p>
<p>Or paste this link into your browser:<br>${link}</p>
<p>If you didn't sign up, you can ignore this email.</p>`,
  });
}

module.exports = { sendVerificationEmail };
