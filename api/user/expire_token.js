const router = require("express").Router();

const config = require("../../config.js");
const passport = require("passport");
const auth_token = require("../../auth/tokens.js");

router.post(
  "/user/expire_token",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  async (req, res, next) => {
    // If all tokens should be expired
    if (req.body.expire_all) {
      exclude_tokens = [];
      if (req.body.exclude_current) {
        exclude_tokens.push(req.user.refresh_token);
      }
      try {
        // Expire all tokens (except the current one, if specified).
        await auth_token.expire_user_tokens(
          req.user._id,
          "Manual expiration.",
          exclude_tokens
        );
        return res
          .status(200)
          .json({ error: false, message: "Tokens expired successfully." });
      } catch (error) {
        return res
          .status(500)
          .json({ error: true, message: "Error expiring tokens." });
      }
    }
    // If only certain tokens should be expired
    try {
      // Expire the specified tokens.
      await auth_token.expire_refresh_tokens(
        req.body.tokens,
        "Manual expiration."
      );
      return res
        .status(200)
        .json({ error: false, message: "Tokens expired successfully." });
    } catch (error) {
      return res
        .status(500)
        .json({ error: true, message: "Error expiring tokens." });
    }
  }
);

module.exports = router;
