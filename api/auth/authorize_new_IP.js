const router = require("express").Router();

const jwt = require("jsonwebtoken");
const config = require("../../config.js");
const new_IP = require("../../auth/new_IP.js");

router.post("/auth/authorize_new_IP", async (req, res) => {
  jwt.verify(
    req.body.new_IP_token,
    config.user.jwt_new_ip_secret,
    (err, verified_token) => {
      if (err) {
        return res.status(401).json({
          error: true,
          message: "Tampered or invalid token",
        });
      } else {
        new_IP
          .check_new_IP_token(
            verified_token.userid,
            verified_token.ip,
            req.body.new_IP_token
          )
          .then((user) => {
            return res.status(200).json({
              error: false,
              message: "New IP address authorized successfully",
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
