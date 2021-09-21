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
        message: "Invalid email",
      });
    }
    email_verification
      .generate_email_verification_token(req.user._id, req.body.email)
      .then((email_verification_token) => {
        res.status(200).json({
          error: false,
          message: "Email verification sent successfully",
        });
      })
      .catch((err) => {
        res.status(400).json({ error: true, message: err });
      });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: true, message: err });
  }
);

module.exports = router;
