const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");
const email = require("../email/email.js");
const send_email_verification_email =
  require("../email/templates/email_verification.js").send_email_verification_email;

async function generate_email_verification_token(userid, email) {
<<<<<<< HEAD
  return new Promise(function (resolve, reject) {
    // Expire previous tokens asynchronously:
    try {
      db.email_verification_token.update(
=======
  return new Promise(async function (resolve, reject) {
    // Expire previous tokens:
    try {
      await db.email_verification_token.update(
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
        { expired: true },
        { where: { userUserid: userid, expired: false } }
      );
    } catch (error) {
      return reject(
        new Error("Failed to expire previous email verification tokens.", {
          cause: error,
        })
      );
    }
    // Generate new token:
    token = jwt.sign(
      { userid: userid, email: email, type: "email_verification" },
      config.user.jwt_email_verification_secret
    );
    try {
<<<<<<< HEAD
      db.email_verification_token.create({
=======
      await db.email_verification_token.create({
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
        userUserid: userid,
        email: email,
        token: token,
        expired: false,
      });
    } catch (error) {
      return reject(
        new Error("Error creating email verification token.", { cause: error })
      );
    }
    send_email_verification_email(
      email,
      config.fqdn + "/auth/verify_email/" + token // Not the real URL for now, when there is a frontend, this will point to that. The frontend will then send a request to the endpoint with the token.
    );
    return resolve();
  });
}

async function check_email_verification_token(userid, user_email, token) {
<<<<<<< HEAD
  email_info = email.get_email_info(user_email);
  return new Promise(async function (resolve, reject) {
=======
  return new Promise(async function (resolve, reject) {
    email_info = email.get_email_info(user_email);
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
    try {
      email_verification_token = await db.email_verification_token.findOne({
        where: { token: token },
      });
    } catch (error) {
      return reject(
        new Error("Failed to find email verification token.", {
          cause: error,
        })
      );
    }

    if (!email_verification_token) {
      return reject(new Error("No such valid email verification token."));
    }
    if (email_verification_token.expired) {
      return reject(new Error("Email verification token is expired."));
    }
    try {
      db.email_verification_token.update(
        { expired: true },
        { where: { token: token } }
      );
    } catch (error) {
      return reject(
        new Error("Failed to expire email verification token.", {
          cause: error,
        })
      );
    }
    user_email = email_info.realemail;
    try {
      await db.user.update(
        {
          email_verified: true,
          email: user_email,
        },
        { where: { userid: userid } }
      );
    } catch (error) {
      // If the error indicates that the email is a duplicate (Another account registered with that email)
      try {
        // Find the user by email
        user = await db.user.findOne({ where: { email: email } });
      } catch (error) {
        // Failed to find user by email
        return reject(
          new Error("Failed to find user by email.", { cause: error })
        );
      }
      // Check if that account's email is verified
      if (user.email_verified) {
        return reject(
<<<<<<< HEAD
          new Error("Email address already in use by another account")
=======
          new Error("Email address already in use by another account.")
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
        );
      }
      // If it is not verified, remove email from the unverified account and add it to the verified one.
      try {
        await db.user.update(
          {
            email: null,
          },
          { where: { email: user_email } }
        ); // Remove the email from the unverified account
      } catch (error) {
        return reject(
          new Error("Failed to remove email from unverified account.", {
            cause: error,
          })
        );
      }
      try {
        // Verify the email on the verified account
        await db.user.update(
          {
            email_verified: true,
            email: user_email,
          },
          { where: { userid: userid } }
        );
<<<<<<< HEAD
        return resolve();
=======
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
      } catch (error) {
        return reject(new Error("Failed to verify email.", { cause: error }));
      }
    }
<<<<<<< HEAD
=======
    return resolve();
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
  });
}
// Callback hell ;(

module.exports = {
  generate_email_verification_token,
  check_email_verification_token,
};
