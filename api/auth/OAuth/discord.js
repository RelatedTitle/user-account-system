const router = require("express").Router();

const auth_token = require("../../../auth/tokens.js");
const passport = require("passport");

// NOTE: Using req.user.userid instead of req.user._id is NOT a bug.
router.get("/auth/discord", (req, res) => {
  passport.authenticate("discord", {
    scope: ["identify", "email"],
    state: req.query.token,
  })(req, res);
});

router.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failWithError: true, session: false }),
  (req, res) => {
    auth_token
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
