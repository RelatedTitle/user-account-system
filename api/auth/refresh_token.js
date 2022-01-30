const router = require("express").Router();

const db = require("../../db/db.js");
const config = require("../../config.js");
const auth_token = require("../../auth/tokens.js");
const jwt = require("jsonwebtoken");

router.post("/auth/refresh_token", async (req, res) => {
  try {
    refresh_token = await db.refresh_token.findOne({
      where: { token: req.body.refresh_token },
    });
  } catch (error) {
    return res
      .status(500)
      .send({ error: true, message: "Error refreshing token." });
  }
  // If there is no refresh token, return an error
  if (!refresh_token) {
    return res
<<<<<<< HEAD
      .status(401)
=======
      .status(403)
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
      .json({ error: true, message: "No such valid refresh token." });
  }
  // If the refresh token has expired, return an error
  if (refresh_token.expired) {
    return res
<<<<<<< HEAD
      .status(401)
=======
      .status(403)
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
      .json({ error: true, message: "Refresh token is expired." });
  }
  // Verify and decode the refresh token.
  try {
    verified_token = jwt.verify(
      refresh_token.token,
      config.user.jwt_auth_secret
    );
  } catch (error) {
    // Error verifying the refresh token.
    return res
      .status(500)
      .send({ error: true, message: "Error verifying refresh token." });
  }
  if (
    Math.round(Date.now() / 1000) - verified_token.iat >=
    config.user.jwt_refresh_token_expiration
  ) {
    // If the refresh token's time of issue has exceeded the expiration time set in config.js.
    auth_token.expire_refresh_tokens([refresh_token.token], "Timeout"); // Expire the refresh token in the database.
    return res
<<<<<<< HEAD
      .status(401)
=======
      .status(403)
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
      .json({ error: true, message: "Refresh token is expired." }); // Return an error (without waiting until the token is expired in the database).
  }
  // Issue new access token:
  access_token = auth_token.issue_access_jwt(
    refresh_token.userUserid,
    refresh_token.email,
    refresh_token.token
  );
  return res.status(200).json({ error: false, access_token: access_token }); // Return the new access token.
});

module.exports = router;
