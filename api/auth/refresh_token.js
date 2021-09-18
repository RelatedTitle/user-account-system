const router = require("express").Router();

const db = require("../../db/db.js");
const config = require("../../config.js");
const issue_jwt = require("../../auth/issue_jwt.js");
const jwt = require("jsonwebtoken");

router.post("/auth/refresh_token", async (req, res) => {
  db.refresh_token
    .findOne({ token: req.body.refresh_token })
    .then((refresh_token) => {
      if (refresh_token) {
        if (refresh_token.expired) {
          return res
            .status(401)
            .json({ error: true, message: "Token is expired" });
        } else {
          jwt.verify(
            refresh_token.token,
            config.user.jwt_auth_secret,
            (err, verified_token) => {
              if (
                Math.round(Date.now() / 1000) - verified_token.iat >=
                config.user.jwt_refresh_token_expiration
              ) {
                db.refresh_token
                  .updateOne(
                    { token: refresh_token.token },
                    { $set: { expired: true } }
                  )
                  .then((expiredToken) => {
                    res
                      .status(401)
                      .json({ error: true, message: "Token is expired" });
                  });
              } else {
                // Issue new access token:
                issue_jwt
                  .issue_access_jwt(refresh_token.userid, refresh_token.email)
                  .then((token) => {
                    res
                      .status(200)
                      .json({ error: false, access_token: token.access_token });
                  });
              }
            }
          );
        }
      } else {
        return res
          .status(401)
          .json({ error: true, message: "No such valid token" });
      }
    });
});

module.exports = router;
