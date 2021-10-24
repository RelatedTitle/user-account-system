const jwt = require("jsonwebtoken");
const config = require("../../config.js");
const db = require("../../db/db.js");
const email = require("../../email/email.js");
const register = require("../register.js");
const avatar = require("../../util/avatar.js");
const link_account = require("./link_account.js").link_account;
const link_account_email = require("./link_account.js").link_account_email;

function get_oauth_username(profile, provider) {
  let username = "";
  switch (provider) {
    case "Google":
      username = profile.displayName;
      break;
    case "Discord":
      username = profile.username;
      break;
    case "GitHub":
      username = profile.username;
      break;
    case "Facebook":
      username = undefined; // Idk
      break;
  }
  return username;
}

function oauth(request, profile, provider) {
  return new Promise((resolve, reject) => {
    let user_email = email.get_oauth_email(profile, provider);
    if (!user_email || user_email == "") {
      // User's email address(es) is(are) private or inaccessible for some other reason
      return reject("Email address private or inaccessible");
    }
    if (request.query.state) {
      // If an access token is provided (the user is linking their account)
      jwt.verify(
        request.query.state,
        config.user.jwt_auth_secret,
        (err, token) => {
          if (err) {
            return reject("Tampered or invalid token");
          }
          if (
            Math.round(Date.now() / 1000) - token.iat >=
            config.user.jwt_access_token_expiration
          ) {
            return reject("Token expired");
          }
          if (token.type != "access") {
            return reject("Incorrect token type");
          }
          // Authenticated
          db.user
            .findOne({ where: { userid: token.user._id } })
            .then((user) => {
              link_account(user, profile, provider)
                .then((linked_user) => {
                  return resolve(linked_user);
                })
                .catch(() => {
                  return reject("Error");
                });
            })
            .catch(() => {
              return reject("Error");
            });
        }
      );
    } else {
      email_info = email.get_email_info(user_email);
      db.account_connection
        .findOne({ where: { id: profile.id }, include: { model: db.user } })
        .then((user) => {
          if (user) {
            // User found:
            return resolve(user.user);
          }
          // User not found by id:

          // Try finding the user by the email address from the OAuth provider.
          db.user
            .findOne({ where: { email: email_info.realemail } })
            .then(async (user) => {
              if (user) {
                // User with the same email address found.
                // If user account already exists, link it to their OAuth account (also automatically verifies the user's email if necessary)
                await link_account_email(profile, provider)
                  .then((linked_user) => {
                    return resolve(linked_user);
                  })
                  .catch(() => {
                    return reject("Error");
                  });
              }
              // If the user couldn't be found by their email address, register a new user (also automatically verifies the user's email if needed):
              register
                .register_user(
                  user_email,
                  get_oauth_username(profile, provider),
                  null,
                  {
                    provider: provider,
                    data: profile,
                  },
                  request.ip,
                  avatar.get_oauth_avatar(profile, provider)
                )
                .then((new_user) => {
                  return resolve(new_user);
                })
                .catch((err) => {
                  return reject(err);
                });
            });
        });
    }
  });
}

module.exports = oauth;
