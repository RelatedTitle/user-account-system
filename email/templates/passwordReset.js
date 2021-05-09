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

async function sendPasswordResetEmail(to, passwordResetURL) {
  return await transporter.sendMail({
    from: config.email.from,
    to: to,
    subject: "[RelatedTechNetwork] Password Reset",
    text: `Someone (hopefully you) has requested a password request for your RelatedTechNetwork account. 
    Please click the following link to change your password.
        
        ${passwordResetURL}

        (If you didn't request a password reset, you can safely ignore this email)
        `,
    // html: "",
  });
}

module.exports = { sendPasswordResetEmail };
