const router = require("express").Router();

const email = require("../../email/email.js");
const db = require("../../db/db.js");
const config = require("../../config.js");
const passport = require("passport");
const email_verification = require("../../auth/email_verification.js");

router.post(
  "/user/change_email",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  async (req, res, next) => {
    // Make sure the email address is valid
    if (!config.user.email_regex.test(req.body.email.toLowerCase())) {
      return res.status(400).json({
        error: true,
        message: "Invalid email address.",
      });
    }
    // Make sure the email is not already in use
    try {
      user = await db.user.findOne({
        where: { email: email.get_email_info(req.body.email).realemail },
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: error.message,
      });
    }
    if (user) {
      // Email is already in use
      if (user.userid == req.user._id) {
        // The user is trying to generate a token for their own email
        return res.status(400).json({
          error: true,
          message: "Email address cannot be the same.",
        });
      }
      // The email is already in use by another user
      return res.status(400).json({
        error: true,
        message: "Email address already in use by another account.",
      });
    }
    // Generate email verification token for the new email address
    email_verification
      .generate_email_verification_token(req.user._id, req.body.email)
      .then((email_verification_token) => {
        res.status(200).json({
          error: false,
          message: "Email verification sent successfully.",
        });
      })
      .catch((error) => {
<<<<<<< HEAD
        res.status(400).json({ error: true, message: error.message });
=======
        return res.status(400).json({ error: true, message: error.message });
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
      });
  }
);

module.exports = router;
