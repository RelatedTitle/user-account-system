const router = require("express").Router();

const passport = require("passport");
const issue_jwt = require("../../auth/issue_jwt.js");
const new_IP = require("../../auth/new_IP.js");
const otp = require("otplib");

// MIDDLEWARE:
const check_captcha = require("../middlewares/captcha.js");

router.post("/auth/login", check_captcha, (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        // Error or no user
        error = new Error(err);
        return res.status(403).json({ error: true, message: info.message });
      }

      if (user["2FA"].active) {
        if (!req.body.totpCode) {
          return res.status(403).json({
            error: true,
            message: "2FA is active but no code was provided",
          });
        }
        if (!otp.authenticator.check(req.body.totpCode, user["2FA"].secret)) {
          return res
            .status(403)
            .json({ error: true, message: "Incorrect TOTP code" });
        }
      }

      let is_new_IP;
      user.userIPs.forEach((ip) => {
        if (ip.ip === req.ip) {
          // If this IP is already in the userIPs list.
          is_new_IP = false;
          if (!ip.authorized) {
            // If the IP already exists in the database, but is not authorized
            return res.json({
              error: true,
              message: "IP address not authorized",
            });
          }
        }
      });
      if (is_new_IP != false) {
        // If the IP is not in the userIPs list, generated newIP token (It will also add it to the usersIP array as unauthorized)
        return await new_IP
          .generate_new_IP_token(user.userid, user.email.email, req.ip)
          .then(() => {
            res.json({
              error: false,
              message: "New IP address, authorization required",
            });
          });
      }

      req.login(user, { session: false }, async (err) => {
        if (err) return res.status(403).json({ error: true, message: "Error" });
        issue_jwt
          .issue_refresh_jwt(user.userid, user.email.email)
          .then((tokens) => {
            return res.json({
              error: false,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
            });
          });
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: true, message: "Error" });
    }
  })(req, res, next);
});

module.exports = router;
