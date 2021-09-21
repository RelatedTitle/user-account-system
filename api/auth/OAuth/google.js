const router = require("express").Router();

const issue_jwt = require("../../../auth/issue_jwt.js");
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
    return res.status(err.status).send({ error: true, message: err.message });
  }
);

module.exports = router;
