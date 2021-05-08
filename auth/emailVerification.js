const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");

async function generateEmailVerificationToken(userid, email) {
  // Expire previous tokens:
  await db.emailVerificationToken.updateMany(
    { userid: userid, expired: false },
    { $set: { expired: true } }
  );
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
  return await emailVerificationToken.save();
}

async function checkEmailVerificationToken(userid, email, token) {
  return new Promise(function (resolve, reject) {
    db.emailVerificationToken
      .findOne({ token: token })
      .then((emailVerificationToken) => {
        if (!emailVerificationToken) {
          reject("No such valid token");
        }
        if (emailVerificationToken.expired == true) {
          reject("Token is expired");
        } else {
          db.emailVerificationToken
            .updateOne({ token: token }, { $set: { expired: true } })
            .then((emailVerificationToken) => {
              db.user
                .updateOne(
                  { userid: userid },
                  {
                    $set: {
                      "email.verified": true,
                      "email.email": email,
                    },
                    $push: {
                      emailhistory: {
                        email: email,
                        date: new Date(),
                        verified: true,
                      },
                    },
                  }
                )
                .then((user) => {
                  resolve(user);
                })
                .catch((err) => {
                  reject(err);
                });
            })
            .catch((err) => {
              console.log("ERR: " + err);
            });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = {
  generateEmailVerificationToken,
  checkEmailVerificationToken,
};
