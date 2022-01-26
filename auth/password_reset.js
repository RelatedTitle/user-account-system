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
  user_email = email.toLowerCase();
  return new Promise(async function (resolve, reject) {
    try {
      // Find user
      user = await db.user.findOne({ where: { email: user_email } });
    } catch (error) {
      return reject(new Error("Error finding user.", { cause: error }));
    }
    if (!user) {
      send_password_reset_email_no_user(user_email);
      return reject(new Error("No such user."));
    }

    try {
      // Expire previous tokens:
      await db.password_reset_token.update(
        { expired: true },
        { where: { email: user_email, expired: false } }
      );
    } catch (error) {
      return reject(
        new Error("Error expiring previous tokens.", { cause: error })
      );
    }

    token = jwt.sign(
      { email: user_email, type: "password_reset" },
      config.user.jwt_password_reset_secret
    );
    try {
      // Create new password resettoken:
      current_password_reset_token = await db.password_reset_token.create({
        email: user_email,
        token: token,
        expired: false,
      });
    } catch (error) {
      return reject(
        new Error("Error creating password reset token.", { cause: error })
      );
    }
    send_password_reset_email(
      user_email,
      config.fqdn + "/auth/reset_password/" + current_password_reset_token.token
    );
    resolve(current_password_reset_token);
  });
}

async function check_password_reset_token(email, password, token) {
  return new Promise(async function (resolve, reject) {
    try {
      // Find password reset token.
      password_reset_token = await db.password_reset_token.findOne({
        where: { token: token },
      });
    } catch (error) {
      return reject(
        new Error("Error finding password reset token.", { cause: error })
      );
    }

    if (!password_reset_token) {
      return reject(new Error("No such valid password reset token."));
    }
    if (password_reset_token !== email) {
      return reject(new Error("Password reset token does not match user"));
    }

    if (password_reset_token.expired) {
      return reject(new Error("Password reset token is expired."));
    }
    try {
      // Find user
      user = await db.user.findOne({ where: { email: email } });
    } catch (error) {
      return reject(new Error("Error finding user.", { cause: error }));
    }
    if (!user) {
      return reject(new Error("No such user."));
    }
    try {
      // Check password
      results = await bcrypt.compare(password, user.password);
    } catch (error) {
      return reject(new Error("Error checking password.", { cause: error }));
    }
    if (results) {
      return reject(new Error("Password cannot be the same."));
    }
    try {
      // Expire password reset token
      await db.password_reset_token.update(
        { expired: true },
        { where: { token: token } }
      );
    } catch (error) {
      return reject(
        new Error("Error expiring password reset token.", { cause: error })
      );
    }
    try {
      // Generate salt
      salt = await bcrypt.genSalt(config.user.bcrypt_salt_rounds);
    } catch (error) {
      return reject(new Error("Error generating salt.", { cause: error }));
    }
    try {
      // Hash password
      hashed_password = await bcrypt.hash(password, salt);
    } catch (error) {
      return reject(new Error("Error hashing password.", { cause: error }));
    }
    user.password = hashed_password;
    try {
      // Save user
      user = await user.save();
    } catch (error) {
      return reject(new Error("Error saving user.", { cause: error }));
    }
    try {
      auth_token.expire_user_tokens(user.userid, "Password Reset"); // Expire all user tokens.
    } catch (error) {
      return reject(new Error("Error expiring user tokens.", { cause: error }));
    }
    try {
      send_password_change_confirmation_email(user.email); // Send password change confirmation email.
    } catch (error) {
      return reject(
        new Error("Error sending password change confirmation email.", {
          cause: error,
        })
      );
    }

    return resolve(user);
  });
}

module.exports = {
  generate_password_reset_token,
  check_password_reset_token,
};
