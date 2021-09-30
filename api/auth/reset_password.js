const router = require("express").Router();

const config = require("../../config.js");
const jwt = require("jsonwebtoken");
const password_reset = require("../../auth/password_reset.js");

router.post("/auth/reset_password", async (req, res) => {
  if (!config.user.password_regex.test(req.body.password)) {
    return res.status(400).json({
      error: true,
      message: "Invalid password",
    });
  }
  jwt.verify(
    req.body.password_reset_token,
    config.user.jwt_password_reset_secret,
    (err, verified_token) => {
      if (err) {
        return res.status(401).json({
          error: true,
          message: "Tampered or invalid token",
        });
      } else {
        password_reset
          .check_password_reset_token(
            verified_token.email,
            req.body.password,
            req.body.password_reset_token
          )
          .then(() => {
            return res.status(200).json({
              error: false,
              message: "Password changed successfully",
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
});

module.exports = router;
