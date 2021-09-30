const router = require("express").Router();

const password_reset = require("../../auth/password_reset.js");

// MIDDLEWARE:
const check_captcha = require("../middleware/captcha.js");

router.post("/auth/request_password_reset", check_captcha, (req, res) => {
  password_reset
    .generatepassword_resetToken(req.body.email)
    .then(() => {
      return res.status(200).json({
        error: false,
        message: "Password reset email sent",
      });
    })
    .catch((error) => {
      if (error === "No such user") {
        return res.status(200).json({
          error: false,
          message: "Password reset email sent",
        });
      } else {
        return res.status(500).json({
          error: false,
          message: "Error sending password reset email",
        });
      }
    });
});

module.exports = router;
