const config = require("../config.js");
const db = require("../db/db.js");
const jwt = require("jsonwebtoken");

const newIPEmail = require("../email/templates/newIP.js");

async function generateNewIPToken(userid, email, IP) {
  return new Promise(function (resolve, reject) {
    db.user.findOne({ userid: userid }).then((user) => {
      if (!user) {
        return reject("No such user");
      } else {
        // Add IP to userIPs array and set authorized to false.
        user.userIPs.push({
          ip: IP,
          dateAdded: new Date(),
          authorized: false,
        });
        user.save().then((updateduser) => {
          // Generate newIP token:
          token = jwt.sign(
            { userid: userid, ip: IP, type: "newIP" },
            config.user.jwtnewipsecret
          );
          newIPToken = new db.newIPToken({
            userid: userid,
            token: token,
            ip: IP,
            expired: false,
          });
          // Save newIP Token
          newIPToken
            .save()
            .then((currentNewIPToken) => {
              // Send new IP email
              newIPEmail
                .sendNewIPEmail(
                  email,
                  config.fqdn +
                    "/auth/authorizeNewIP/" +
                    currentNewIPToken.token,
                  IP
                )
                .then((emailInfo) => {
                  resolve(currentNewIPToken);
                });
            })
            .catch((err) => {
              return reject("Error saving new IP token");
            });
        });
      }
    });
  });
}

async function checkNewIPToken(userid, IP, token) {
  return new Promise(function (resolve, reject) {
    db.newIPToken.findOne({ token: token }).then((newIPToken) => {
      if (!newIPToken) {
        return reject("No such valid token");
      }
      if (newIPToken.expired == true) {
        return reject("Token is expired");
      } else {
        db.user.findOne({ userid: userid }).then((user) => {
          if (!user) {
            reject("No such user");
          } else {
            db.newIPToken
              .updateOne({ token: token }, { $set: { expired: true } })
              .then((newIPToken) => {
                // Expire the token
                for (let i = 0; i < user.userIPs.length; i++) {
                  // Find the IP in the userIPs array and authorize it.
                  if (user.userIPs[i].ip == IP) {
                    user.userIPs[i].authorized = true;
                    user.userIPs[i].dateAuthorized = new Date();
                  }
                }
                user.save().then((updateduser) => {
                  resolve(updateduser);
                });
              });
          }
        });
      }
    });
  });
}

module.exports = { generateNewIPToken, checkNewIPToken };
