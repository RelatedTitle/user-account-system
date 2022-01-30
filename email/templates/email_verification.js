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

async function send_email_verification_email(to, email_verification_URL) {
  if (!config.email.send_email) {
    return;
  }
  return await transporter.sendMail({
    from: config.email.from,
    to: to,
    subject: `[${config.servicename}] Email Verification`,
    text: `Please click the following link to verify your ${config.servicename} account.
        
        ${email_verification_URL}
        `,
    // html: "",
  });
}

module.exports = { send_email_verification_email };
