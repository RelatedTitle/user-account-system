const config = require("../config.js");
const db = require("../db/db.js");
const jwt = require("jsonwebtoken");

const new_IP_email = require("../email/templates/new_IP.js");

async function generate_new_IP_token(userid, email, IP) {
  return new Promise(function (resolve, reject) {
    db.user.findOne({ userid: userid }).then((user) => {
      if (!user) {
        return reject("No such user");
      } else {
        // Add IP to userIPs array and set authorized to false.
        user.userIPs.push({
          ip: IP,
          date_added: new Date(),
          authorized: false,
        });
        user.save().then((updated_user) => {
          // Generate newIP token:
          token = jwt.sign(
            { userid: userid, ip: IP, type: "newIP" },
            config.user.jwt_new_ip_secret
          );
          new_IP_token = new db.new_IP_token({
            userid: userid,
            token: token,
            ip: IP,
            expired: false,
          });
          // Save newIP Token
          new_IP_token
            .save()
            .then((currentnew_IP_token) => {
              // Send new IP email
              new_IP_email
                .send_new_IP_email(
                  email,
                  config.fqdn +
                    "/auth/authorizeNewIP/" +
                    currentnew_IP_token.token,
                  IP
                )
                .then((email_info) => {});
              return resolve(currentnew_IP_token);
            })
            .catch((err) => {
              console.log(err);
              return reject("Error saving new IP token");
            });
        });
      }
    });
  });
}

async function check_new_IP_token(userid, IP, token) {
  return new Promise(function (resolve, reject) {
    db.new_IP_token.findOne({ token: token }).then((new_IP_token) => {
      if (!new_IP_token) {
        return reject("No such valid token");
      }
      if (new_IP_token.expired) {
        return reject("Token is expired");
      } else {
        db.user.findOne({ userid: userid }).then((user) => {
          if (!user) {
            reject("No such user");
          } else {
            db.new_IP_token
              .updateOne({ token: token }, { $set: { expired: true } })
              .then((new_IP_token) => {
                // Expire the token
                user.userIPs.forEach((ip) => {
                  // Find the IP in the userIPs array and authorize it.
                  if (ip.ip === IP) {
                    ip.authorized = true;
                    ip.date_authorized = new Date();
                  }
                });
                user.save().then((updated_user) => {
                  resolve(updated_user);
                });
              });
          }
        });
      }
    });
  });
}

module.exports = { generate_new_IP_token, check_new_IP_token };
