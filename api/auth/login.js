const router = require("express").Router();

const passport = require("passport");
const auth_token = require("../../auth/tokens.js");
const check_user_ip = require("../../util/check_user_ip.js");
const otp = require("otplib");

// MIDDLEWARE:
const check_captcha = require("../middleware/captcha.js");

router.post("/auth/login", check_captcha, (req, res, next) => {
  passport.authenticate("login", async (error, user, info) => {
    try {
      if (error || !user) {
        // Error or no user
        error = new Error(error);
        return res.status(403).json({ error: true, message: info.message });
      }

      if (user.MFA_active) {
        if (!req.body.totp_code) {
          return res.status(403).json({
            error: true,
            message: "2FA is active but no code was provided.",
          });
        }
        if (!otp.authenticator.check(req.body.totp_code, user.MFA_secret)) {
          return res
            .status(403)
            .json({ error: true, message: "Incorrect TOTP code." });
        }
      }

      // Check if the user IP is authorized
      try {
        await check_user_ip(user, req.ip);
      } catch (error) {
<<<<<<< HEAD
        return res
          .status(403)
          .json({ error: true, message: user_ip_error.message });
=======
        return res.status(403).json({ error: true, message: error.message });
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
      }
      req.login(user, { session: false }, async (error) => {
        if (error) {
          return res.status(403).json({ error: true, message: error.message });
        }
        auth_token.issue_refresh_jwt(user.userid, user.email).then((tokens) => {
          return res.json({
            error: false,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
        });
      });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  })(req, res, next);
});

module.exports = router;
