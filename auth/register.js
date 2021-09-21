const config = require("../config.js");
const db = require("../db/db.js");
const email = require("../email/email.js");
const bcrypt = require("bcrypt");
const trustscore = require("../trustscore.js");

const email_verification = require("./email_verification.js");

const { customAlphabet } = require("nanoid");
const generateuserid = customAlphabet(
  config.user.id_alphabet,
  config.user.id_length
);

async function register_user(
  user_email,
  user_username,
  user_password,
  oauth_data,
  IP
) {
  let email_info = email.get_email_info(user_email);
  let userid = generateuserid();
  let currentDate = new Date();

  if (!user_username) {
    // If no username is provided, use userid as username
    user_username = userid.toString();
  }

  return new Promise(function (resolve, reject) {
    // Gets email info:
    // Generates salt with defined salt rounds in config:
    bcrypt.genSalt(config.user.bcrypt_salt_rounds, function (err, salt) {
      // Hashes password:
      bcrypt.hash(user_password, salt, function (err, hashed_password) {
        //Stores user in DB:
        let new_user = new db.user({
          userid: userid,
          username: {
            display_username: user_username,
            real_username: user_username?.toLowerCase(),
          },
          email: {
            email: email_info.realemail,
            verified: false,
          },
          password: hashed_password,
          creation_date: currentDate,
          oauth: {},
        });
        if (oauth_data) {
          // If registering through an OAuth provider.
          // If the provider is GitHub, we know for a fact that the email is verified since it is required to use OAuth. (https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/authorizing-oauth-apps)
          // If the provider is Google, we know whether the email is verified or not by profile.email_verified.
          // If the provider is Discord, we know whether the email is verified by profile.verified.
          // If the provider is Facebook, we don't know whether the email is verified or not.
          if (
            oauth_data.data.email_verified ||
            (oauth_data.provider == "Discord" && oauth_data.data.verified) ||
            oauth_data.provider == "GitHub"
          ) {
            // User's email address is not verified and matches the one in the account they're linking (which is verified).
            new_user.email.verified = true; // Verify the email address.
          }
          new_user.oauth[`${oauth_data.provider.toLowerCase()}oauthid`] =
            oauth_data.data.id;
          new_user.account_connections.push({
            provider: oauth_data.provider,
            data: oauth_data.data,
          });
        }
        // Add registration IP as an authorized user IP:
        new_user.userIPs.push({
          ip: IP,
          date_added: new Date(),
          authorized: true,
          date_authorized: new Date(),
        });
        new_user
          .save()
          .then((registered_user) => {
            if (config.user.captchaenabled) {
              trustscore.trustAction(
                registered_user.userid,
                "completedCaptcha",
                { captcha: "User registration captcha" }
              );
            }
            // Created user successfully

            // Send email verification token (if not verified already):
            if (!registered_user.email.verified) {
              email_verification
                .generate_email_verification_token(
                  registered_user.userid,
                  registered_user.email.email
                )
                .then((email_verification_token) => {
                  // Email verification token sent.
                });
              return resolve(registered_user);
            } else {
              // User registered without sending an email verification token.
              return resolve(registered_user);
            }
          })
          .catch((err) => {
            if (err.code === 11000) {
              if (
                Object.keys(err.keyValue) == "email.email" ||
                Object.keys(err.keyValue) == "emailhistory.email"
              ) {
                // Already existing current or past email
                return reject("Email already exists");
              } else if (
                Object.keys(err.keyValue) == "username.display_username" ||
                Object.keys(err.keyValue) == "username.real_username"
              ) {
                // Already existing username
                if (oauth_data) {
                  // If registering through an OAuth provider, recursively call register_user without providing a username (so it uses the userid).
                  register_user(user_email, null, null, oauth_data, IP)
                    .then((registered_user) => {
                      return resolve(registered_user);
                    })
                    .catch((err) => {
                      return reject(err);
                    });
                } else {
                  return reject("Username already exists");
                }
              } else {
                // Something else is not unique when it is supposed to be
                return reject("Unknown error");
              }
            } else {
              // Some other error
              return reject("Unknown error");
            }
          });
      });
    });
  });
}

module.exports = { register_user };
