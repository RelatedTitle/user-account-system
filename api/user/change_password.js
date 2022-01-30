const router = require("express").Router();

const auth_token = require("../../auth/tokens.js");
const db = require("../../db/db.js");
const passport = require("passport");
const config = require("../../config.js");
const bcrypt = require("bcrypt");
const send_password_change_confirmation_email =
  require("../../email/templates/password_reset_confirmation.js").send_password_change_confirmation_email;

router.post(
  "/user/change_password",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  async (req, res, next) => {
    if (req.body.old_password === req.body.new_password) {
      return res.status(403).json({
        error: true,
        message: "Password cannot be the same.",
      });
    }
    if (!config.user.password_regex.test(req.body.new_password)) {
      return res.status(403).json({
        error: true,
        message: "Invalid password.",
      });
    }
    // Get user.
    try {
      user = await db.user.findOne({ where: { userid: req.user._id } });
    } catch (error) {
      // Error finding user.
      return res.status(500).json({
        error: true,
        message: "Error finding user.",
      });
    }
    // Check if the old password is correct.
    try {
<<<<<<< HEAD
      results = bcrypt.compare(req.body.old_password, user.password);
=======
      results = await bcrypt.compare(req.body.old_password, user.password);
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: "Error checking old password.",
      });
    }
    // If the old password is not correct, return an error.
    if (!results) {
      return res.status(403).json({
        error: true,
        message: "Incorrect password.",
      });
    }
    // If the old password is correct, update the password.
    // Generate salt.
    try {
      salt = await bcrypt.genSalt(config.user.bcrypt_salt_rounds);
    } catch (error) {
      // Error generating salt.
      return res.status(500).json({
        error: true,
        message: "Error generating salt.",
      });
    }
    // Hash password:
    try {
      hashed_password = await bcrypt.hash(req.body.new_password, salt);
    } catch (error) {
      // Error hashing password.
      return res.status(500).json({
        error: true,
        message: "Error hashing password.",
      });
    }
    // Update user with new hashed password.
    try {
      await db.user.update(
        { password: hashed_password },
        { where: { userid: req.user._id } }
      );
<<<<<<< HEAD
      auth_token.expire_user_tokens(req.user._id, "Password Change", [
=======
      await auth_token.expire_user_tokens(req.user._id, "Password Change", [
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
        req.user.refresh_token,
      ]); // Expire all tokens for this user. (Except the current one.)
      send_password_change_confirmation_email(user.email); // Send password change confirmation email.
      return res.status(200).json({
        error: false,
        message: "Password changed successfully.",
      });
    } catch (error) {
      // Error updating user, expiring tokens, or sending password change confirmation email.
      return res.status(500).json({
        error: true,
        message: "Error updating user.",
      });
    }
  }
);

module.exports = router;
