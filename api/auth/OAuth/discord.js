const router = require("express").Router();

const issue_jwt = require("../../../auth/issue_jwt.js");
const passport = require("passport");

// NOTE: Using req.user.userid instead of req.user._id is NOT a bug.
router.get(
  "/auth/discord",
  passport.authenticate("discord", { scope: ["identify", "email"] })
);

router.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { session: false }),
  (req, res) => {
    issue_jwt
      .issue_refresh_jwt(req.user.userid, req.user.email.email)
      .then((tokens) => {
        return res.json({
          error: false,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
      });
  }
);

module.exports = router;
