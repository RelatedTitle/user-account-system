const router = require("express").Router();

const password_reset = require("../../auth/password_reset.js");

// MIDDLEWARE:
const check_captcha = require("../middleware/captcha.js");

router.post("/auth/request_password_reset", check_captcha, (req, res) => {
  password_reset
    .generate_password_reset_token(req.body.email)
    .then(() => {
      return res.status(200).json({
        error: false,
        message: "Password reset email sent.",
      });
    })
    .catch((error) => {
<<<<<<< HEAD
      if (error === "No such user.") {
=======
      if (error.message === "No such user.") {
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
        return res.status(200).json({
          error: false,
          message: "Password reset email sent.",
        });
      } else {
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    });
});

module.exports = router;
