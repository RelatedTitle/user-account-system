const router = require("express").Router();

const config = require("../../config.js");
const jwt = require("jsonwebtoken");
const email_verification = require("../../auth/email_verification.js");

router.post(
  "/auth/verify_email/:email_verification_token?",
  async (req, res) => {
    // Verify and decode the email verification token.
    try {
      verified_token = jwt.verify(
        req.body.email_verification_token,
        config.user.jwt_email_verification_secret
      );
    } catch (error) {
      // Error verifying the email verification token.
      return res.status(401).json({
        error: true,
        message: "Tampered or invalid token.",
      });
    }
    // Check (and verify) the email verification token.
    try {
      await email_verification.check_email_verification_token(
        verified_token.userid,
        verified_token.email,
        req.body.email_verification_token
      );
      // If no errors were thrown, the email verification token is valid.
      return res.status(200).json({
        error: false,
        message: "Email verified successfully.",
      });
    } catch (error) {
      // Error checking email verification token.
      return res.status(401).json({
        error: true,
        message: error.message,
      });
    }
  }
);

module.exports = router;
