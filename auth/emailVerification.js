const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db.js");

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
        if (
          emailVerificationToken.userid == userid &&
          emailVerificationToken.email == email
        ) {
          if (emailVerificationToken.expired == true) {
            reject("Token is expired");
          } else {
            db.emailVerificationToken
              .updateOne({ token: token }, { $set: { expired: true } })
              .then((emailVerificationToken) => {
                db.user.findOne({ userid: userid }).then((user) => {
                  user.email.verified = true;
                  for (let i = 0; i < user.emailhistory.length; i++) {
                    if (user.emailhistory[i].email == email) {
                      user.emailhistory[i].verified = true;
                    }
                  }
                  user
                    .save()
                    .then((user) => {
                      resolve(user);
                    })
                    .catch((err) => {
                      reject(err);
                    });
                });
              })
              .catch((err) => {
                console.log("ERR: " + err);
              });
          }
        } else {
          reject("Token does not match user");
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
