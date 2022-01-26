const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");
const email = require("../email/email.js");
const send_email_verification_email =
  require("../email/templates/email_verification.js").send_email_verification_email;

async function generate_email_verification_token(userid, email) {
  return new Promise(function (resolve, reject) {
    // Expire previous tokens:
    db.email_verification_token
      .update(
        { expired: true },
        { where: { userUserid: userid, expired: false } }
      )
      .then(() => {
        token = jwt.sign(
          { userid: userid, email: email, type: "email_verification" },
          config.user.jwt_email_verification_secret
        );
        db.email_verification_token
          .create({
            userUserid: userid,
            email: email,
            token: token,
            expired: false,
          })
          .then(() => {
            send_email_verification_email(
              email,
              config.fqdn + "/auth/verify_email/" + token // Not the real URL for now, when there is a frontend, this will point to that. The frontend will then send a request to the endpoint with the token.
            );
            return resolve();
          });
      });
  });
}

function check_email_verification_token(userid, user_email, token) {
  email_info = email.get_email_info(user_email);
  return new Promise(function (resolve, reject) {
    db.email_verification_token
      .findOne({ where: { token: token } })
      .then((email_verification_token) => {
        if (!email_verification_token) {
          return reject(new Error("No such valid email verification token."));
        }
        if (email_verification_token.expired) {
          return reject(new Error("Email verification token is expired."));
        }
        db.email_verification_token
          .update({ expired: true }, { where: { token: token } })
          .then(() => {
            user_email = email_info.realemail;
            db.user
              .update(
                {
                  email_verified: true,
                  email: user_email,
                },
                { where: { userid: userid } }
              )
              .then(() => {
                return resolve();
              })
              .catch(async (error) => {
                // If the error indicates that the email is a duplicate (Another account registered with that email)
                await db.user
                  .findOne({ where: { email: email } })
                  .then((user) => {
                    // Check if that account's email is verified
                    if (user.email_verified) {
                      return reject(
                        new Error(
                          "Email address already in use by another account"
                        )
                      );
                    }
                    // If it is not verified, remove email from the unverified account and add it to the verified one.
                    db.user
                      .update(
                        {
                          email: null,
                        },
                        { where: { email: user_email } }
                      )
                      .then(() => {
                        db.user
                          .update(
                            {
                              email_verified: true,
                              email: user_email,
                            },
                            { where: { userid: userid } }
                          )
                          .then(() => {
                            return resolve();
                          });
                      });
                  });
                return reject(
                  new Error("Failed to find user.", { cause: error })
                );
              });
          });
      })
      .catch((error) => {
        return reject(
          new Error("Failed to find email verification token.", {
            cause: error,
          })
        );
      });
  });
}
// Callback hell ;(

module.exports = {
  generate_email_verification_token,
  check_email_verification_token,
};
