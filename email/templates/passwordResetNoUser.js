const config = require("../../config.js");
const mailer = require("nodemailer");

let transporter = mailer.createTransport({
  host: config.email.smtp.hostname,
  port: config.email.smtp.port,
  secure: config.email.smtp.secure,
  auth: {
    user: config.email.smtp.auth.user,
    pass: config.email.smtp.auth.password,
  },
});

async function sendPasswordResetEmailNoUser(to) {
  return await transporter.sendMail({
    from: config.email.from,
    to: to,
    subject: "[RelatedTechNetwork] Password Reset",
    text: `Someone (hopefully you) has requested a password request for this email address. 
    However, this email address does not match any account in our records. If you requested this password reset, please make sure you have a RelatedTechNetwork account and are using the correct email address.

        (If you didn't request a password reset, you can safely ignore this email)
        `,
    // html: "",
  });
}

module.exports = { sendPasswordResetEmailNoUser };
