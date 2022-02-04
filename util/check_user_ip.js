const db = require("../db/db.js");
const new_IP = require("../auth/new_IP.js");

async function check_user_ip(user, ip) {
  // Verify the IP is authorized
  try {
    var userip = await db.userip.findOne({
      where: { userUserid: user.userid, ip: ip },
    });
  } catch (error) {
    throw new Error("Failed to find user IP.", { cause: error });
  }
  // Using if elses here because returning would not stop execution
  if (!userip) {
    // If the IP is not in the userIPs table, generate newIP token (It will also add it to the useriPs table as unauthorized)
    try {
      await new_IP.generate_new_IP_token(user.userid, user.email, ip);
    } catch (error) {
      // Failed to generate new IP token
      throw new Error("Failed to generate new IP token.", { cause: error });
    }
    // Throw error after generating new IP token
    throw new Error("New IP address, authorization required.");
  } else if (!userip.authorized) {
    // If the IP is in the userIPs table but not authorized
    throw new Error("IP address not authorized.");
  }
  // If the IP is in the userIPs table and authorized
  return;
}

module.exports = check_user_ip;
