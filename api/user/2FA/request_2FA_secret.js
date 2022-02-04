const router = require("express").Router();

const passport = require("passport");
const db = require("../../../db/db.js");
const otp = require("otplib");

router.post(
  "/user/request_2FA_secret",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  async (req, res, next) => {
    try {
      var user = await db.user.findOne({ where: { userid: req.user._id } });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: "Error getting user.",
      });
    }
    if (user.MFA_active) {
      return res.status(403).json({
        error: true,
        message: "2FA is already enabled.",
      });
    }
    let secret = otp.authenticator.generateSecret();
    try {
      await db.user.update(
        {
          MFA_active: false,
          MFA_secret: secret,
        },
        { where: { userid: req.user._id } }
      );
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: "Error updating user.",
      });
    }
    return res.status(200).json({
      error: false,
      totp_secret: secret,
    });
  }
);

module.exports = router;
