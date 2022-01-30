const router = require("express").Router();

const passport = require("passport");
const db = require("../../../db/db.js");
const otp = require("otplib");

router.post(
  "/user/request_2FA_secret",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    db.user.findOne({ where: { userid: req.user._id } }).then((user) => {
<<<<<<< HEAD
      if (!user.MFA_secret) {
        if (user.MFA_active) {
          return res.status(403).json({
            error: true,
            message: "2FA is already enabled.",
          });
        }
=======
      if (user.MFA_active) {
        return res.status(403).json({
          error: true,
          message: "2FA is already enabled.",
        });
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
      }
      secret = otp.authenticator.generateSecret();
      db.user
        .update(
          {
            MFA_active: false,
            MFA_secret: secret,
          },
          { where: { userid: req.user._id } }
        )
        .then(() => {
          return res.status(200).json({
            error: false,
            totp_secret: secret,
          });
        });
    });
  }
);

module.exports = router;
