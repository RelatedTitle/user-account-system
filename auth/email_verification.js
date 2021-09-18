const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");
const email = require("../email/email.js");
const email_verification_email = require("../email/templates/email_verification.js");

async function generate_email_verification_token(userid, email) {
  return new Promise(function (resolve, reject) {
    // Expire previous tokens:
    db.email_verification_token
      .updateMany(
        { userid: userid, expired: false },
        { $set: { expired: true } }
      )
      .then((expired_tokens) => {
        token = jwt.sign(
          { userid: userid, email: email, type: "email_verification" },
          config.user.jwt_email_verification_secret
        );
        email_verification_token = new db.email_verification_token({
          userid: userid,
          email: email,
          token: token,
          expired: false,
        });
        email_verification_token.save().then((new_email_verification_token) => {
          email_verification_email
            .send_email_verification_email(
              email,
              config.fqdn + "/auth/verifyEmail/" + token // Not the real URL for now, when there is a frontend, this will point to that. The frontend will then send a request to the endpoint with the token.
            )
            .then((email_info) => {});
          return resolve();
        });
      });
  });
}

async function check_email_verification_token(userid, useremail, token) {
  email_info = await email.get_email_info(useremail);
  return new Promise(function (resolve, reject) {
    db.email_verification_token
      .findOne({ token: token })
      .then((email_verification_token) => {
        if (!email_verification_token) {
          return reject("No such valid token");
        }
        if (email_verification_token.expired) {
          return reject("Token is expired");
        } else {
          db.email_verification_token
            .updateOne({ token: token }, { $set: { expired: true } })
            .then((email_verification_token) => {
              useremail = email_info.realemail;
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
                  if (err.code === 11000) {
                    // If the error indicates that the email is a duplicate (Another account registered with that email)
                    db.user.findOne({ "email.email": email }).then((user) => {
                      // Check if that account's email is verified
                      if (user.email.verified) {
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
  generate_email_verification_token,
  check_email_verification_token,
};
