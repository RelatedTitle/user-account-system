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

async function send_new_IP_email(to, new_IP_URL, IP) {
  if (!config.email.send_email) {
    return;
  }
  return await transporter.sendMail({
    from: config.email.from,
    to: to,
    subject: `[${config.servicename}] Authorize login from a new IP address`,
    text: `We've noticed that you recently tried to log in to your ${config.servicename} account from a new IP address.

    IP Address: ${IP}

    To authorize this IP address, please click on the following link:
    ${new_IP_URL}

    If this wasn't you, please change your password immediately as your account may be compromised.
        `,
    // html: "",
  });
}

module.exports = { send_new_IP_email };
