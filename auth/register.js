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
  userEmail,
  userUsername,
  userPassword,
  oauthData,
  IP
) {
  let email_info = await email.get_email_info(userEmail);
  let userid = generateuserid();
  let currentDate = new Date();

  if (!userUsername) {
    // If no username is provided, use userid as username
    userUsername = userid.toString();
  }

  return new Promise(function (resolve, reject) {
    // Gets email info:
    // Generates salt with defined salt rounds in config:
    bcrypt.genSalt(config.user.bcrypt_salt_rounds, function (err, salt) {
      // Hashes password:
      bcrypt.hash(userPassword, salt, function (err, hashed_password) {
        //Stores user in DB:
        let newUser = new db.user({
          userid: userid,
          username: {
            display_username: userUsername,
            real_username: userUsername?.toLowerCase(),
          },
          email: {
            email: email_info.realemail,
            verified: false,
          },
          password: hashed_password,
          creation_date: currentDate,
          oauth: {},
        });
        if (oauthData) {
          switch (oauthData.provider) {
            case "Google":
              newUser.oauth.googleoauthid = oauthData.data.id;
              newUser.email.verified = true;
              break;
            case "GitHub":
              newUser.oauth.githuboauthid = oauthData.data.id;
              newUser.email.verified = true;
              break;
            case "Discord":
              newUser.oauth.discordoauthid = oauthData.data.id;
              newUser.email.verified = oauthData.data.verified;
              break;
            case "Facebook":
              newUser.oauth.facebookoauthid = oauthData.data.id;
              newUser.email.verified = true;
              break;
            default:
              break;
          }
          newUser.account_connections.push({
            provider: oauthData.provider,
            data: oauthData.data,
          });
        }
        // Add registration IP as an authorized user IP:
        newUser.userIPs.push({
          ip: IP,
          date_added: new Date(),
          authorized: true,
          date_authorized: new Date(),
        });
        newUser
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
                  console.log(
                    "Created user " +
                      registered_user.userid +
                      ", username " +
                      registered_user.username.display_username +
                      " email " +
                      registered_user.email.email +
                      "."
                  );
                });
              resolve(registered_user);
            } else {
              console.log(
                "Created user " +
                  registered_user.userid +
                  ", username " +
                  registered_user.username.display_username +
                  " email " +
                  registered_user.email.email +
                  "."
              );
              resolve(registered_user);
            }
          })
          .catch((err) => {
            console.log(err);
            console.log("Failed to register user.");
            if (err.code === 11000) {
              console.log(email_info.realemail);
              if (
                Object.keys(err.keyValue) == "email.email" ||
                Object.keys(err.keyValue) == "emailhistory.email"
              ) {
                // Already existing current or past email
                console.log("Email already exists");
                reject("Email already exists");
              } else if (
                Object.keys(err.keyValue) == "username.display_username" ||
                Object.keys(err.keyValue) == "username.real_username"
              ) {
                // Already existing username
                console.log("Username already exists");
                reject("Username already exists");
              } else {
                // Something else is not unique when it is supposed to be
                console.log(err);
                reject("Unknown error");
              }
            } else {
              // Some other error
              console.log(err);
              reject("Unknown error");
            }
          });
      });
    });
  });
}

module.exports = { register_user };
