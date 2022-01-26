const router = require("express").Router();

const config = require("../../config.js");
const passport = require("passport");
const email_verification = require("../../auth/email_verification.js");

router.post(
  "/user/change_email",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    if (!config.user.email_regex.test(req.body.email.toLowerCase())) {
      return res.status(400).json({
        error: true,
        message: "Invalid email address.",
      });
    }
    email_verification
      .generate_email_verification_token(req.user._id, req.body.email)
      .then((email_verification_token) => {
        res.status(200).json({
          error: false,
          message: "Email verification sent successfully.",
        });
      })
      .catch((error) => {
        res.status(400).json({ error: true, message: error.message });
      });
  }
);

module.exports = router;
