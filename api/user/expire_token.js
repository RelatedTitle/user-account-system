const router = require("express").Router();

const config = require("../../config.js");
const passport = require("passport");
const auth_token = require("../../auth/tokens.js");

router.post(
  "/user/expire_token",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    // If all tokens should be expired
    if (req.body.expire_all) {
      exclude_tokens = [];
      if (req.body.exclude_current) {
        exclude_tokens.push(req.user.refresh_token);
      }
      auth_token
        .expire_user_tokens(req.user._id, "Manual expiration.", exclude_tokens)
        .then((tokens) => {
          return res
            .status(200)
            .json({ error: false, message: "Tokens expired successfully." });
        }); // Expire all tokens for this user. (Except the current one, if specified.)
    } else {
      // If only certain tokens should be expired
      auth_token
        .expire_refresh_tokens(req.body.tokens, "Manual expiration.")
        .then((tokens) => {
          return res
            .status(200)
            .json({ error: false, message: "Tokens expired successfully." });
        });
    }
  }
);

module.exports = router;
