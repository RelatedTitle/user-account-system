const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");
const email = require("../email/email.js");
const emailVerificationEmail = require("../email/templates/emailVerification.js");

async function generateEmailVerificationToken(userid, email) {
  return new Promise(function (resolve, reject) {
    // Expire previous tokens:
    db.emailVerificationToken
      .updateMany(
        { userid: userid, expired: false },
        { $set: { expired: true } }
      )
      .then((expiredTokens) => {
        token = jwt.sign(
          { userid: userid, email: email, type: "emailverification" },
          config.user.jwtemailverificationsecret
        );
        emailVerificationToken = new db.emailVerificationToken({
          userid: userid,
          email: email,
          token: token,
          expired: false,
        });
        emailVerificationToken.save().then((newEmailVerificationToken) => {
          emailVerificationEmail
            .sendEmailVerificationEmail(
              email,
              config.fqdn + "/auth/verifyEmail/" + token // Not the real URL for now, when there is a frontend, this will point to that. The frontend will then send a request to the endpoint with the token.
            )
            .then((emailInfo) => {
              return resolve(emailInfo);
            });
        });
      });
  });
}

async function checkEmailVerificationToken(userid, useremail, token) {
  emailinfo = await email.getemailinfo(useremail);
  return new Promise(function (resolve, reject) {
    db.emailVerificationToken
      .findOne({ token: token })
      .then((emailVerificationToken) => {
        if (!emailVerificationToken) {
          return reject("No such valid token");
        }
        if (emailVerificationToken.expired == true) {
          return reject("Token is expired");
        } else {
          db.emailVerificationToken
            .updateOne({ token: token }, { $set: { expired: true } })
            .then((emailVerificationToken) => {
              useremail = emailinfo.realemail;
              db.user
                .updateOne(
                  { userid: userid },
                  {
                    $set: {
                      "email.verified": true,
                      "email.email": useremail,
                    },
                    $push: {
                      emailhistory: {
                        email: useremail,
                        date: new Date(),
                        verified: true,
                      },
                    },
                  }
                )
                .then((user) => {
                  return resolve(user);
                })
                .catch((err) => {
                  if (err.code == 11000) {
                    // If the error indicates that the email is a duplicate (Another account registered with that email)
                    db.user.findOne({ "email.email": email }).then((user) => {
                      // Check if that account's email is verified
                      if (user.email.verified == true) {
                        return reject(
                          "Email address already in use by another account"
                        );
                      } else {
                        // If it is not verified, remove email from the unverified account and add it to the verified one.
                        db.user
                          .updateOne(
                            { "email.email": useremail },
                            {
                              $set: { "email.email": undefined },
                              $unset: { emailhistory: [] },
                            }
                          )
                          .then((unverifiedUser) => {
                            db.user
                              .updateOne(
                                { userid: userid },
                                {
                                  $set: {
                                    "email.verified": true,
                                    "email.email": useremail,
                                  },
                                  $push: {
                                    emailhistory: {
                                      email: useremail,
                                      date: new Date(),
                                      verified: true,
                                    },
                                  },
                                }
                              )
                              .then((user) => {
                                return resolve(user);
                              })
                              .catch((err) => {
                                console.log("Err");
                              });
                          });
                      }
                    });
                  } else {
                    return reject(err);
                  }
                });
            })
            .catch((err) => {
              console.log("ERR: " + err);
            });
        }
      })
      .catch((err) => {
        return reject(err);
      });
  });
}
// Callback hell ;(

module.exports = {
  generateEmailVerificationToken,
  checkEmailVerificationToken,
};
