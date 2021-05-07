const config = require("../config.js");
const db = require("../db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function generatePasswordResetToken(email) {
  userEmail = email.toLowerCase();
  return new Promise(function (resolve, reject) {
    db.user.findOne({ "email.email": userEmail }).then((user) => {
      if (!user) {
        reject("No such user");
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
                resolve(currentPasswordResetToken);
              })
              .catch((err) => {
                reject("Error saving password reset token");
              });
          })
          .catch((err) => {
            reject("Error expiring previous tokens");
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
          reject("No such valid token");
        }
        if (passwordResetToken.email == email) {
          if (passwordResetToken.expired == true) {
            reject("Token is expired");
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
                                      resolve(user);
                                    })
                                    .catch((err) => {
                                      reject("Password hashing error");
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
                reject("Password error");
              });
          }
        } else {
          reject("Token does not match user");
        }
      })
      .catch((err) => {
        console.log(err);
        reject("Unknown Error");
      });
  });
}

module.exports = { generatePasswordResetToken, checkPasswordResetToken };
