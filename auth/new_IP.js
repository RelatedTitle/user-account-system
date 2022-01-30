const config = require("../config.js");
const db = require("../db/db.js");
const jwt = require("jsonwebtoken");

const send_new_IP_email =
  require("../email/templates/new_IP.js").send_new_IP_email;

async function generate_new_IP_token(userid, email, IP) {
  return new Promise(async function (resolve, reject) {
    try {
      // Find user.
      user = await db.user.findOne({ where: { userid: userid } });
    } catch (error) {
      return reject(new Error("Failed to find user.", { cause: error }));
    }
    if (!user) {
      return reject(new Error("No such user."));
    }
    // Create new IP in database.
    try {
      db.userip.create({
        userUserid: user.userid,
        ip: IP,
        date_added: new Date(),
        authorized: false,
      });
    } catch (error) {
      return reject(new Error("Failed to create new IP.", { cause: error }));
    }
    // Generate newIP token:
    token = jwt.sign(
      { userid: userid, ip: IP, type: "newIP" },
      config.user.jwt_new_ip_secret
    );
    try {
      // Create new IP token.
      current_new_IP_token = await db.new_IP_token.create({
        userUserid: userid,
        token: token,
        ip: IP,
        expired: false,
      });
    } catch (error) {
      return reject(new Error("Error saving new IP token", { cause: error }));
    }

    send_new_IP_email(
      email,
      config.fqdn + "/auth/authorize_new_IP/" + current_new_IP_token.token,
      IP
    );
    return resolve(current_new_IP_token);
  });
}

async function check_new_IP_token(userid, IP, token) {
  return new Promise(async function (resolve, reject) {
    try {
      // Find new IP token.
      new_IP_token = await db.new_IP_token.findOne({ where: { token: token } });
    } catch (error) {
      return reject(
        new Error("Failed to find new IP token.", { cause: error })
      );
    }
    if (!new_IP_token) {
      return reject(new Error("No such valid new IP token."));
    }
    if (new_IP_token.expired) {
      return reject(new Error("New IP token is expired."));
    }
    try {
      // Find user.
      user = await db.user.findOne({ where: { userid: userid } });
    } catch (error) {
      return reject(new Error("Failed to find user.", { cause: error }));
    }
    if (!user) {
      return reject(new Error("No such user."));
    }
    try {
      // Expire the token.
      await db.new_IP_token.update(
        { expired: true },
        { where: { token: token } }
      );
    } catch (error) {
      return reject(
        new Error("Failed to expire new IP token.", { cause: error })
      );
    }
    try {
      // Authorize IP
      await db.userip.update(
        { authorized: true, date_authorized: new Date() },
        { where: { userUserid: userid, ip: IP } }
      );
    } catch (error) {
      return reject(new Error("Failed to authorize new IP.", { cause: error }));
    }

    new_IP_token.authorized = true;
    new_IP_token.date_authorized = new Date(); // Will be different than the one in the DB by a few ms but it doesn't matter
    return resolve(new_IP_token);
  });
}

module.exports = { generate_new_IP_token, check_new_IP_token };
