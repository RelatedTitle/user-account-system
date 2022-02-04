const router = require("express").Router();

const password_reset = require("../../auth/password_reset.js");

// MIDDLEWARE:
const check_captcha = require("../middleware/captcha.js");

router.post("/auth/request_password_reset", check_captcha, async (req, res) => {
  try {
    await password_reset.generate_password_reset_token(req.body.email); // Generate password reset token.
  } catch (error) {
    // Error generating password reset token.
    if (error.message === "No such user.") {
      // No user matching the email address was found, but we still respond as if the user exists.
      return res.status(200).json({
        error: false,
        message: "Password reset email sent.",
      });
    }
    // Some other error occurred.
    return res.status(500).json({
      error: true,
      message: error.message,
    });
  }
  return res.status(200).json({
    error: false,
    message: "Password reset email sent.",
  });
});

module.exports = router;
