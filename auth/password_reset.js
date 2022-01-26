const config = require("../config.js");
const db = require("../db/db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth_token = require("./tokens.js");

const send_password_reset_email =
  require("../email/templates/password_reset.js").send_password_reset_email;
const send_password_reset_email_no_user =
  require("../email/templates/password_reset_no_user.js").send_password_reset_email_no_user;
const send_password_change_confirmation_email =
  require("../email/templates/password_reset_confirmation.js").send_password_change_confirmation_email;

async function generate_password_reset_token(email) {
  user_email = email.toLowerCase();
  return new Promise(function (resolve, reject) {
    db.user.findOne({ where: { email: user_email } }).then((user) => {
      if (!user) {
        send_password_reset_email_no_user(user_email);
        return reject(new Error("No such user."));
      } else {
        // Expire previous tokens:
        db.password_reset_token
          .update(
            { expired: true },
            { where: { email: user_email, expired: false } }
          )
          .then(() => {
            token = jwt.sign(
              { email: user_email, type: "password_reset" },
              config.user.jwt_password_reset_secret
            );
            db.password_reset_token
              .create({
                email: user_email,
                token: token,
                expired: false,
              })
              .then((current_password_reset_token) => {
                send_password_reset_email(
                  user_email,
                  config.fqdn +
                    "/auth/reset_password/" +
                    current_password_reset_token.token
                );
                resolve(current_password_reset_token);
              })
              .catch((error) => {
                return reject(
                  new Error("Error saving password reset token.", {
                    cause: error,
                  })
                );
              });
          })
          .catch((error) => {
            return reject(
              new Error("Error expiring previous tokens", { cause: error })
            );
          });
      }
    });
  });
}

async function check_password_reset_token(email, password, token) {
  return new Promise(function (resolve, reject) {
    db.password_reset_token
      .findOne({ where: { token: token } })
      .then((password_reset_token) => {
        if (!password_reset_token) {
          return reject(new Error("No such valid password reset token."));
        }
        if (password_reset_token.email === email) {
          if (password_reset_token.expired) {
            return reject(new Error("Password reset token is expired."));
          } else {
            db.user
              .findOne({ where: { email: email } })
              .then((user) => {
                if (!user) {
                  reject(new Error("No such user."));
                } else {
                  bcrypt.compare(password, user.password).then((results) => {
                    if (results) {
                      reject(new Error("Password cannot be the same."));
                    } else {
                      db.password_reset_token
                        .update({ expired: true }, { where: { token: token } })
                        .then(() => {
                          bcrypt.genSalt(
                            config.user.bcrypt_salt_rounds,
                            function (error, salt) {
                              // Hashes password:
                              bcrypt.hash(
                                password,
                                salt,
                                function (error, hashed_password) {
                                  user.password = hashed_password;
                                  user
                                    .save()
                                    .then((user) => {
                                      auth_token.expire_user_tokens(
                                        user.userid,
                                        "Password Reset"
                                      ); // Expire all user tokens.
                                      send_password_change_confirmation_email(
                                        user.email
                                      );
                                      return resolve(user);
                                    })
                                    .catch((error) => {
                                      return reject(
                                        new Error("Error hashing password.", {
                                          cause: error,
                                        })
                                      );
                                    });
                                }
                              );
                            }
                          );
                        });
                    }
                  });
                }
              })
              .catch((error) => {
                return reject(
                  new Error("Error finding user.", { cause: error })
                );
              });
          }
        } else {
          return reject(new Error("Password reset token does not match user"));
        }
      })
      .catch((error) => {
        return reject(
          new Error("Error finding password reset token.", { cause: error })
        );
      });
  });
}

module.exports = {
  generate_password_reset_token,
  check_password_reset_token,
};
