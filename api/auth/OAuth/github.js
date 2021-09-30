const router = require("express").Router();

const issue_jwt = require("../../../auth/issue_jwt.js");
const passport = require("passport");

// NOTE: Using req.user.userid instead of req.user._id is NOT a bug.
router.get("/auth/github", (req, res) => {
  passport.authenticate("github", {
    scope: ["profile", "email", "user:email"],
    state: req.query.token,
  })(req, res);
});

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failWithError: true, session: false }),
  (req, res) => {
    issue_jwt
      .issue_refresh_jwt(req.user.userid, req.user.email)
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
