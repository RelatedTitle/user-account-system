const router = require("express").Router();

const jwt = require("jsonwebtoken");
const config = require("../../config.js");
const new_IP = require("../../auth/new_IP.js");

router.post("/auth/authorize_new_IP", async (req, res) => {
  let verified_token;
  try {
    verified_token = jwt.verify(
      req.body.new_IP_token,
      config.user.jwt_new_ip_secret
    );
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: error.message,
    });
  }
  new_IP
    .check_new_IP_token(
      verified_token.userid,
      verified_token.ip,
      req.body.new_IP_token
    )
    .then(() => {
      return res.status(200).json({
        error: false,
        message: "New IP address authorized successfully.",
      });
    })
    .catch((error) => {
      return res.status(401).json({
        error: true,
        message: error.message,
      });
    });
});

module.exports = router;
