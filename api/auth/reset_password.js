const router = require("express").Router();

const config = require("../../config.js");
const jwt = require("jsonwebtoken");
const password_reset = require("../../auth/password_reset.js");

router.post("/auth/reset_password", async (req, res) => {
  if (!config.user.password_regex.test(req.body.password)) {
    return res.status(400).json({
      error: true,
      message: "Invalid password.",
    });
  }
  // Verify and decode the password reset token.
  try {
    var verified_token = jwt.verify(
      req.body.password_reset_token,
      config.user.jwt_password_reset_secret
    );
  } catch (error) {
    // Error verifying the password reset token.
    return res.status(401).json({
      error: true,
      message: "Error verifying password reset token.",
    });
  }
  try {
    // Check password reset token.
    await password_reset.check_password_reset_token(
      verified_token.email,
      req.body.password,
      req.body.password_reset_token
    );
    // If no errors were thrown, the password reset token is valid.
    return res.status(200).json({
      error: false,
      message: "Password changed successfully.",
    });
  } catch (error) {
    // Error checking password reset token.
    return res.status(401).json({
      error: true,
      message: error.message,
    });
  }
});

module.exports = router;
