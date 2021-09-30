const db = require("../db/db.js");
const new_IP = require("../auth/new_IP.js");

async function check_user_ip(user, ip) {
  return new Promise(async (resolve, reject) => {
    // Verify the IP is authorized
    db.userip
      .findOne({ where: { userUserid: user.userid, ip: ip } })
      .then(async (userip) => {
        // Using if elses here because returning would not stop execution
        if (!userip) {
          // If the IP is not in the userIPs table, generate newIP token (It will also add it to the useriPs table as unauthorized)
          await new_IP
            .generate_new_IP_token(user.userid, user.email, ip)
            .then(() => {
              return resolve({
                error: false,
                message: "New IP address, authorization required",
              });
            });
        } else if (!userip.authorized) {
          // If the IP is in the userIPs table but not authorized
          return reject({ error: true, message: "IP address not authorized" });
        } else {
          // If the IP is in the userIPs table and authorized
          return resolve();
        }
      });
  });
}

module.exports = check_user_ip;
