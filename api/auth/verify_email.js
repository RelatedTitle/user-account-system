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
      (err, verified_token) => {
        if (err) {
          return res.status(401).json({
            error: true,
            message: "Tampered or invalid token",
          });
        } else {
          email_verification
            .check_email_verification_token(
              verified_token.userid,
              verified_token.email,
              req.params["email_verification_token"] ||
                req.body.email_verification_token
            )
            .then((user) => {
              return res.status(200).json({
                error: false,
                message: "Email verified successfully",
              });
            })
            .catch((err) => {
              return res.status(401).json({
                error: true,
                message: err,
              });
            });
        }
      }
    );
  }
);

module.exports = router;
