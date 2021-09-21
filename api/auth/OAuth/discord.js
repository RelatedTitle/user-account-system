const router = require("express").Router();

const issue_jwt = require("../../../auth/issue_jwt.js");
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
    issue_jwt
      .issue_refresh_jwt(req.user.userid, req.user.email.email)
      .then((tokens) => {
        return res.json({
          error: false,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
      });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: true, message: err.message });
  }
);

module.exports = router;
