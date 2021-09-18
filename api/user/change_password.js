const router = require("express").Router();

const db = require("../../db/db.js");
const passport = require("passport");
const config = require("../../config.js");
const bcrypt = require("bcrypt");
const password_reset_confirmation_email = require("../../email/templates/password_reset_confirmation.js");

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
    db.user.findOne({ userid: req.user._id }).then((user) => {
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
                  .updateOne(
                    { userid: req.user._id },
                    { $set: { password: hashed_password } }
                  )
                  .then((newUser) => {
                    password_reset_confirmation_email
                      .send_password_change_confirmation_email(user.email)
                      .then((email_info) => {
                        return res.status(200).json({
                          error: false,
                          message: "Password changed successfully",
                        });
                      });
                  })
                  .catch((err) => {
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
    return res.status(401).send({ error: false, message: err });
  }
);

module.exports = router;
