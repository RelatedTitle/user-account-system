const router = require("express").Router();

const auth_token = require("../../auth/tokens.js");
const db = require("../../db/db.js");
const passport = require("passport");
const config = require("../../config.js");
const bcrypt = require("bcrypt");
const send_password_change_confirmation_email =
  require("../../email/templates/password_reset_confirmation.js").send_password_change_confirmation_email;

router.post(
  "/user/change_password",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    if (req.body.old_password === req.body.new_password) {
      return res.status(403).json({
        error: true,
        message: "Password cannot be the same",
      });
    }
    if (!config.user.password_regex.test(req.body.new_password)) {
      return res.status(403).json({
        error: true,
        message: "Invalid Password",
      });
    }
    db.user.findOne({ where: { userid: req.user._id } }).then((user) => {
      bcrypt.compare(req.body.old_password, user.password).then((results) => {
        if (results) {
          // Generates Salt:
          bcrypt.genSalt(config.user.bcrypt_salt_rounds, function (err, salt) {
            // Hashes password:
            bcrypt.hash(
              req.body.new_password,
              salt,
              function (err, hashed_password) {
                db.user
                  .update(
                    { password: hashed_password },
                    { where: { userid: req.user._id } }
                  )
                  .then(() => {
                    auth_token.expire_user_tokens(
                      req.user._id,
                      "Password Change",
                      [req.user.refresh_token]
                    ); // Expire all tokens for this user. (Except the current one.)
                    send_password_change_confirmation_email(user.email).then(
                      () => {
                        return res.status(200).json({
                          error: false,
                          message: "Password changed successfully",
                        });
                      }
                    );
                  })
                  .catch(() => {
                    return res.status(500).json({
                      error: true,
                      message: "Unknown Error",
                    });
                  });
              }
            );
          });
        } else {
          return res.status(403).json({
            error: true,
            message: "Incorrect password",
          });
        }
      });
    });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: true, message: err });
  }
);

module.exports = router;
