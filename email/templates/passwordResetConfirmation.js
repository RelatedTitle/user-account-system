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

async function sendPasswordChangeConfirmationEmail(to) {
  return await transporter.sendMail({
    from: config.email.from,
    to: to,
    subject: "[RelatedTechNetwork] Password Change Confirmation",
    text: `This email is to let you know that your account's password has been changed.

    If you did not change your password, please contact support immediately.
        `,
    // html: "",
  });
}

module.exports = { sendPasswordChangeConfirmationEmail };
