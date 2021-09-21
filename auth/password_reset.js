const config = require("../config.js");
const db = require("../db/db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const send_password_reset_email =
  require("../email/templates/password_reset.js").send_password_reset_email;
const send_password_reset_email_no_user =
  require("../email/templates/password_reset_no_user.js").send_password_reset_email_no_user;
const send_password_change_confirmation_email =
  require("../email/templates/password_reset_confirmation.js").send_password_change_confirmation_email;

async function generate_password_reset_token(email) {
  user_email = email.toLowerCase();
  return new Promise(function (resolve, reject) {
    db.user.findOne({ "email.email": user_email }).then((user) => {
      if (!user) {
        send_password_reset_email_no_user(user_email).then((email_info) => {});
        return reject("No such user");
      } else {
        // Expire previous tokens:
        db.password_reset_token
          .updateMany(
            { email: user_email, expired: false },
            { $set: { expired: true } }
          )
          .then((tokens) => {
            token = jwt.sign(
              { email: user_email, type: "password_reset" },
              config.user.jwt_password_reset_secret
            );
            password_reset_token = new db.password_reset_token({
              email: user_email,
              token: token,
              expired: false,
            });
            password_reset_token
              .save()
              .then((current_password_reset_token) => {
                send_password_reset_email(
                  user_email,
                  config.fqdn +
                    "/auth/reset_password/" +
                    current_password_reset_token.token
                ).then((email_info) => {});
                resolve(current_password_reset_token);
              })
              .catch((err) => {
                return reject("Error saving password reset token");
              });
          })
          .catch((err) => {
            return reject("Error expiring previous tokens");
          });
      }
    });
  });
}

async function check_password_reset_token(email, password, token) {
  return new Promise(function (resolve, reject) {
    db.passwordResetToken
      .findOne({ token: token })
      .then((passwordResetToken) => {
        if (!passwordResetToken) {
          return reject("No such valid token");
        }
        if (passwordResetToken.email === email) {
          if (passwordResetToken.expired) {
            return reject("Token is expired");
          } else {
            db.user
              .findOne({ "email.email": email })
              .then((user) => {
                if (!user) {
                  reject("No such user");
                } else {
                  bcrypt.compare(password, user.password).then((results) => {
                    if (results) {
                      reject("Password cannot be the same");
                    } else {
                      db.passwordResetToken
                        .updateOne(
                          { token: token },
                          { $set: { expired: true } }
                        )
                        .then((passwordResetToken) => {
                          bcrypt.genSalt(
                            config.user.bcrypt_salt_rounds,
                            function (err, salt) {
                              // Hashes password:
                              bcrypt.hash(
                                password,
                                salt,
                                function (err, hashed_password) {
                                  user.password = hashed_password;
                                  user
                                    .save()
                                    .then((user) => {
                                      send_password_change_confirmation_email(
                                        user.email.email
                                      ).then((email_info) => {});
                                      return resolve(user);
                                    })
                                    .catch((err) => {
                                      return reject("Password hashing error");
                                    });
                                }
                              );
                            }
                          );
                        })
                        .catch((err) => {});
                    }
                  });
                }
              })
              .catch((err) => {
                return reject("Password error");
              });
          }
        } else {
          return reject("Token does not match user");
        }
      })
      .catch((err) => {
        return reject("Unknown Error");
      });
  });
}

module.exports = {
  generate_password_reset_token,
  check_password_reset_token,
};
