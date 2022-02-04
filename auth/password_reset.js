const config = require("../config.js");
const db = require("../db/db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth_token = require("./tokens.js");

const send_password_reset_email =
  require("../email/templates/password_reset.js").send_password_reset_email;
const send_password_reset_email_no_user =
  require("../email/templates/password_reset_no_user.js").send_password_reset_email_no_user;
const send_password_change_confirmation_email =
  require("../email/templates/password_reset_confirmation.js").send_password_change_confirmation_email;

async function generate_password_reset_token(email) {
  let user_email = email.toLowerCase();
  try {
    // Find user
    var user = await db.user.findOne({ where: { email: user_email } });
  } catch (error) {
    throw new Error("Error finding user.", { cause: error });
  }
  if (!user) {
    send_password_reset_email_no_user(user_email);
    throw new Error("No such user.");
  }
  try {
    // Expire previous tokens:
    await db.password_reset_token.update(
      { expired: true },
      { where: { email: user_email, expired: false } }
    );
  } catch (error) {
    throw new Error("Error expiring previous tokens.", { cause: error });
  }

  let token = jwt.sign(
    { email: user_email, type: "password_reset" },
    config.user.jwt_password_reset_secret
  );
  try {
    // Create new password resettoken:
    var current_password_reset_token = await db.password_reset_token.create({
      userUserid: user.userid,
      email: user_email,
      token: token,
      expired: false,
    });
  } catch (error) {
    throw new Error("Error creating password reset token.", { cause: error });
  }
  send_password_reset_email(
    user_email,
    config.fqdn + "/auth/reset_password/" + current_password_reset_token.token
  );
  return current_password_reset_token;
}

async function check_password_reset_token(email, password, token) {
  try {
    // Find password reset token.
    var password_reset_token = await db.password_reset_token.findOne({
      where: { token: token },
    });
  } catch (error) {
    throw new Error("Error finding password reset token.", { cause: error });
  }

  if (!password_reset_token) {
    throw new Error("No such valid password reset token.");
  }
  if (password_reset_token.email !== email) {
    throw new Error("Password reset token does not match user.");
  }
  if (password_reset_token.expired) {
    throw new Error("Password reset token is expired.");
  }
  try {
    // Find user
    var user = await db.user.findOne({ where: { email: email } });
  } catch (error) {
    throw new Error("Error finding user.", { cause: error });
  }
  if (!user) {
    throw new Error("No such user.");
  }
  try {
    // Check password
    var results = await bcrypt.compare(password, user.password);
  } catch (error) {
    throw new Error("Error checking password.", { cause: error });
  }
  if (results) {
    throw new Error("Password cannot be the same.");
  }
  try {
    // Expire password reset token
    await db.password_reset_token.update(
      { expired: true },
      { where: { token: token } }
    );
  } catch (error) {
    throw new Error("Error expiring password reset token.", { cause: error });
  }
  try {
    // Generate salt
    var salt = await bcrypt.genSalt(config.user.bcrypt_salt_rounds);
  } catch (error) {
    throw new Error("Error generating salt.", { cause: error });
  }
  try {
    // Hash password
    var hashed_password = await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error("Error hashing password.", { cause: error });
  }
  user.password = hashed_password;
  try {
    // Save user
    user = await user.save();
  } catch (error) {
    throw new Error("Error saving user.", { cause: error });
  }
  try {
    await auth_token.expire_user_tokens(user.userid, "Password Reset"); // Expire all user tokens.
  } catch (error) {
    throw new Error("Error expiring user tokens.", { cause: error });
  }
  try {
    send_password_change_confirmation_email(user.email); // Send password change confirmation email.
  } catch (error) {
    throw new Error("Error sending password change confirmation email.", {
      cause: error,
    });
  }
  return user;
}

module.exports = {
  generate_password_reset_token,
  check_password_reset_token,
};
