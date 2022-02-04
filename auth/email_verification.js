const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");
const email = require("../email/email.js");
const send_email_verification_email =
  require("../email/templates/email_verification.js").send_email_verification_email;

async function generate_email_verification_token(userid, email) {
  // Expire previous tokens:
  try {
    await db.email_verification_token.update(
      { expired: true },
      { where: { userUserid: userid, expired: false } }
    );
  } catch (error) {
    throw new Error("Failed to expire previous email verification tokens.", {
      cause: error,
    });
  }
  // Generate new token:
  let token = jwt.sign(
    { userid: userid, email: email, type: "email_verification" },
    config.user.jwt_email_verification_secret
  );
  try {
    await db.email_verification_token.create({
      userUserid: userid,
      email: email,
      token: token,
      expired: false,
    });
  } catch (error) {
    throw new Error("Error creating email verification token.", {
      cause: error,
    });
  }
  send_email_verification_email(
    email,
    config.fqdn + "/auth/verify_email/" + token // Not the real URL for now, when there is a frontend, this will point to that. The frontend will then send a request to the endpoint with the token.
  );
  return;
}

async function check_email_verification_token(userid, user_email, token) {
  let email_info = email.get_email_info(user_email);
  try {
    var email_verification_token = await db.email_verification_token.findOne({
      where: { token: token },
    });
  } catch (error) {
    throw new Error("Failed to find email verification token.", {
      cause: error,
    });
  }

  if (!email_verification_token) {
    throw new Error("No such valid email verification token.");
  }
  if (email_verification_token.expired) {
    throw new Error("Email verification token is expired.");
  }
  try {
    db.email_verification_token.update(
      { expired: true },
      { where: { token: token } }
    );
  } catch (error) {
    throw new Error("Failed to expire email verification token.", {
      cause: error,
    });
  }
  user_email = email_info.real_email;
  try {
    await db.user.update(
      {
        email_verified: true,
        email: user_email,
      },
      { where: { userid: userid } }
    );
  } catch (error) {
    throw new Error("Failed to verify email.", { cause: error });
  }
  return;
}

module.exports = {
  generate_email_verification_token,
  check_email_verification_token,
};
