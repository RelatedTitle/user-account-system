const router = require("express").Router();

const config = require("../../config.js");
const jwt = require("jsonwebtoken");
const email_verification = require("../../auth/email_verification.js");

router.post(
  "/auth/verify_email/:email_verification_token?",
  async (req, res) => {
    jwt.verify(
      req.params["email_verification_token"] ||
        req.body.email_verification_token,
      config.user.jwt_email_verification_secret,
      (error, verified_token) => {
        if (error) {
          return res.status(401).json({
            error: true,
            message: "Tampered or invalid token.",
          });
        } else {
          email_verification
            .check_email_verification_token(
              verified_token.userid,
              verified_token.email,
              req.params["email_verification_token"] ||
                req.body.email_verification_token
            )
            .then(() => {
              return res.status(200).json({
                error: false,
                message: "Email verified successfully.",
              });
            })
            .catch((error) => {
              return res.status(401).json({
                error: true,
                message: error.message,
              });
            });
        }
      }
    );
  }
);

module.exports = router;
