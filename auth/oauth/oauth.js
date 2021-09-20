const jwt = require("jsonwebtoken");
const config = require("../../config.js");
const db = require("../../db/db.js");
const email = require("../../email/email.js");
const register = require("../register.js");
const link_account = require("./link_account.js").link_account;
const link_account_email = require("./link_account.js").link_account_email;

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
            .findOne({ id: token.userid })
            .then((user) => {
              link_account(user, profile, provider)
                .then((linked_user) => {
                  return resolve(linked_user);
                })
                .catch((err) => {
                  console.log(`1: ${err}`);
                  return reject("Error");
                });
            })
            .catch((err) => {
              console.log(`2: ${err}`);
              return reject("Error");
            });
        }
      );
    }
    email_info = email.get_email_info(user_email);
    db.user
      .findOne({ [`oauth.${provider.toLowerCase()}oauthid`]: profile.id })
      .then((user) => {
        if (user) {
          // User found:
          return resolve(user);
        }
        // Register a new user (also automatically verifies the user's email):
        register
          .register_user(user_email, null, null, {
            provider: provider,
            data: profile,
          })
          .then((new_user) => {
            return resolve(new_user);
          })
          .catch((err) => {
            if (err === "Email already exists") {
              // If user account already exists, link it to their OAuth account (also automatically verifies the user's email if necessary)
              link_account_email(profile, provider)
                .then((linked_user) => {
                  return resolve(linked_user);
                })
                .catch((err) => {
                  console.log(`3: ${err}`);
                  return reject("Error");
                });
            }
            // Some other error
            return reject("Unknown Error");
          });
      });
  });
}

module.exports = oauth;
