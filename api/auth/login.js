const router = require("express").Router();

const passport = require("passport");
const issue_jwt = require("../../auth/issue_jwt.js");
const check_user_ip = require("../../util/check_user_ip.js");
const otp = require("otplib");

// MIDDLEWARE:
const check_captcha = require("../middleware/captcha.js");

router.post("/auth/login", check_captcha, (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        // Error or no user
        error = new Error(err);
        return res.status(403).json({ error: true, message: info.message });
      }

      if (user.MFA_active) {
        if (!req.body.totp_code) {
          return res.status(403).json({
            error: true,
            message: "2FA is active but no code was provided",
          });
        }
        if (!otp.authenticator.check(req.body.totp_code, user.MFA_secret)) {
          return res
            .status(403)
            .json({ error: true, message: "Incorrect TOTP code" });
        }
      }

      // Check if the user IP is authorized
      let user_ip_response = null;
      await check_user_ip(user, req.ip).catch((response) => {
        user_ip_response = response;
      });
      if (user_ip_response !== null) {
        return res.status(403).json(user_ip_response);
      }

      req.login(user, { session: false }, async (err) => {
        if (err) {
          return res.status(403).json({ error: true, message: "Error" });
        }
        issue_jwt.issue_refresh_jwt(user.userid, user.email).then((tokens) => {
          return res.json({
            error: false,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
        });
      });
    } catch (err) {
      return res.status(500).json({ error: true, message: "Error" });
    }
  })(req, res, next);
});

module.exports = router;
