const config = require("../config.js");
const db = require("../db/db.js");
const jwt = require("jsonwebtoken");

const send_new_IP_email =
  require("../email/templates/new_IP.js").send_new_IP_email;

async function generate_new_IP_token(userid, email, IP) {
  return new Promise(function (resolve, reject) {
    db.user.findOne({ where: { userid: userid } }).then((user) => {
      if (!user) {
        return reject(new Error("No such user."));
      } else {
        // Add IP to userIPs array and set authorized to false.
        db.userip
          .create({
            userUserid: user.userid,
            ip: IP,
            date_added: new Date(),
            authorized: false,
          })
          .then(() => {
            // Generate newIP token:
            token = jwt.sign(
              { userid: userid, ip: IP, type: "newIP" },
              config.user.jwt_new_ip_secret
            );
            db.new_IP_token
              .create({
                userUserid: userid,
                token: token,
                ip: IP,
                expired: false,
              })
              .then((current_new_IP_token) => {
                // Send new IP email
                send_new_IP_email(
                  email,
                  config.fqdn +
                    "/auth/authorize_new_IP/" +
                    current_new_IP_token.token,
                  IP
                );
                return resolve(current_new_IP_token);
              })
              .catch((error) => {
                return reject(
                  new Error("Error saving new IP token", { cause: error })
                );
              });
          });
      }
    });
  });
}

async function check_new_IP_token(userid, IP, token) {
  return new Promise(function (resolve, reject) {
    db.new_IP_token
      .findOne({ where: { token: token } })
      .then((new_IP_token) => {
        if (!new_IP_token) {
          return reject(new Error("No such valid new IP token."));
        }
        if (new_IP_token.expired) {
          return reject(new Error("New IP token is expired."));
        } else {
          db.user.findOne({ where: { userid: userid } }).then((user) => {
            if (!user) {
              reject(new Error("No such user."));
            } else {
              // Expire the token
              db.new_IP_token
                .update({ expired: true }, { where: { token: token } })
                .then(() => {
                  // Authorize IP
                  db.userip
                    .update(
                      { authorized: true, date_authorized: new Date() },
                      { where: { userUserid: userid, ip: IP } }
                    )
                    .then(() => {
                      new_IP_token.authorized = true;
                      new_IP_token.date_authorized = new Date(); // Will be different than the one in the DB by a few ms but it doesn't matter
                      return resolve(new_IP_token);
                    })
                    .catch((error) => {
                      return reject(
                        new Error("Error authorizing IP.", { cause: error })
                      );
                    });
                });
            }
          });
        }
      });
  });
}

module.exports = { generate_new_IP_token, check_new_IP_token };
