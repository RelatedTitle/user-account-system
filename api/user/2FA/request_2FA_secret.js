const router = require("express").Router();

const passport = require("passport");
const db = require("../../../db/db.js");
const otp = require("otplib");

router.post(
  "/user/request_2FA_secret",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    db.user.findOne({ userid: req.user._id }).then((user) => {
      if (user["2FA"] != undefined) {
        if (user["2FA"].active) {
          return res.status(403).json({
            error: true,
            message: "2FA is already enabled",
          });
        }
      }
      secret = otp.authenticator.generateSecret();
      db.user
        .updateOne(
          { userid: req.user._id },
          {
            $set: {
              "2FA": { active: false, secret: secret },
            },
          }
        )
        .then((updated_user) => {
          return res.status(200).json({
            error: false,
            totp_secret: secret,
          });
        });
    });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: true, message: err });
  }
);

module.exports = router;
