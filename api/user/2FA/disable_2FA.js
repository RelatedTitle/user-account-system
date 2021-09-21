const router = require("express").Router();

const passport = require("passport");
const db = require("../../../db/db.js");
const otp = require("otplib");

router.post(
  "/user/disable_2FA",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    db.user.findOne({ userid: req.user._id }).then((user) => {
      if (user["2FA"]?.active != true) {
        return res.status(403).json({
          error: true,
          message: "2FA is not enabled",
        });
      }

      if (otp.authenticator.check(req.body.totp_code, user["2FA"].secret)) {
        // If the totp code provided by the user matches the one generated by the secret in the db.
        db.user
          .updateOne(
            { userid: req.user._id },
            { $set: { "2FA.active": false } }
          )
          .then((updated_user) => {
            // Set 2FA as inactive
            return res.status(200).json({
              error: false,
              message: "2FA disabled successfully",
            });
          });
      } else {
        return res.status(403).json({
          error: false,
          message: "Incorrect TOTP code",
        });
      }
    });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: true, message: err });
  }
);

module.exports = router;
