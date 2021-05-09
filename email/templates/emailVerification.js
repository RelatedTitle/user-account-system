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

async function sendEmailVerificationEmail(to, emailVerificationURL) {
  return await transporter.sendMail({
    from: config.email.from,
    to: to,
    subject: "[RelatedTechNetwork] Email Verification",
    text: `Please click the following link to verify your RelatedTechNetwork account.
        
        ${emailVerificationURL}
        `,
    // html: "",
  });
}

module.exports = { sendEmailVerificationEmail };
