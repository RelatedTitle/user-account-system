const router = require("express").Router();

const auth_token = require("../../../auth/tokens.js");
const passport = require("passport");

// NOTE: Using req.user.userid instead of req.user._id is NOT a bug.
router.get("/auth/google", (req, res) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: req.query.token,
  })(req, res);
});

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failWithError: true, session: false }),
  (req, res) => {
    auth_token
      .issue_refresh_jwt(req.user.userid, req.user.email)
      .then((tokens) => {
        return res.json({
          error: false,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
      })
      .catch((error) => {
        return res.json({
          error: true,
          message: error.message,
        });
      });
  }
);

module.exports = router;
