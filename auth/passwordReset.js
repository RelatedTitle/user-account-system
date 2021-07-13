const config = require("../config.js");
const db = require("../db/db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const passwordResetEmail = require("../email/templates/passwordReset.js");
const passwordResetEmailNoUser = require("../email/templates/passwordResetNoUser.js");
const passwordResetConfirmationEmail = require("../email/templates/passwordResetConfirmation.js");

async function generatePasswordResetToken(email) {
  userEmail = email.toLowerCase();
  return new Promise(function (resolve, reject) {
    db.user.findOne({ "email.email": userEmail }).then((user) => {
      if (!user) {
        passwordResetEmailNoUser
          .sendPasswordResetEmailNoUser(userEmail)
          .then((emailInfo) => {
            return reject("No such user");
          });
      } else {
        // Expire previous tokens:
        db.passwordResetToken
          .updateMany(
            { email: userEmail, expired: false },
            { $set: { expired: true } }
          )
          .then((tokens) => {
            token = jwt.sign(
              { email: userEmail, type: "passwordreset" },
              config.user.jwtpasswordresetsecret
            );
            passwordResetToken = new db.passwordResetToken({
              email: userEmail,
              token: token,
              expired: false,
            });
            passwordResetToken
              .save()
              .then((currentPasswordResetToken) => {
                passwordResetEmail
                  .sendPasswordResetEmail(
                    userEmail,
                    config.fqdn +
                      "/auth/resetPassword/" +
                      currentPasswordResetToken.token
                  )
                  .then((emailInfo) => {
                    resolve(currentPasswordResetToken);
                  });
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

async function checkPasswordResetToken(email, password, token) {
  return new Promise(function (resolve, reject) {
    db.passwordResetToken
      .findOne({ token: token })
      .then((passwordResetToken) => {
        if (!passwordResetToken) {
          return reject("No such valid token");
        }
        if (passwordResetToken.email == email) {
          if (passwordResetToken.expired == true) {
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
                            config.user.bcryptsaltrounds,
                            function (err, salt) {
                              // Hashes password:
                              bcrypt.hash(
                                password,
                                salt,
                                function (err, hashedPassword) {
                                  user.password = hashedPassword;
                                  user
                                    .save()
                                    .then((user) => {
                                      passwordResetConfirmationEmail
                                        .sendPasswordChangeConfirmationEmail(
                                          user.email.email
                                        )
                                        .then((emailInfo) => {
                                          return resolve(user);
                                        });
                                    })
                                    .catch((err) => {
                                      return reject("Password hashing error");
                                    });
                                }
                              );
                            }
                          );
                        })
                        .catch((err) => {
                          console.log("ERR: " + err);
                        });
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
        console.log(err);
        return reject("Unknown Error");
      });
  });
}

module.exports = { generatePasswordResetToken, checkPasswordResetToken };
