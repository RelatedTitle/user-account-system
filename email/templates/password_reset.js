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

async function send_password_reset_email(to, password_reset_URL) {
  if (!config.email.send_email) {
    return;
  }
  return await transporter.sendMail({
    from: config.email.from,
    to: to,
    subject: `[${config.servicename}] Password Reset`,
    text: `Someone (hopefully you) has requested a password request for your ${config.servicename} account. 
    Please click the following link to change your password.
        
        ${password_reset_URL}

        (If you didn't request a password reset, you can safely ignore this email)
        `,
    // html: "",
  });
}

module.exports = { send_password_reset_email };
