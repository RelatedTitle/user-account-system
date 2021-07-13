const config = require("../config.js");
const db = require("../db/db.js");
const email = require("../email/email.js");
const bcrypt = require("bcrypt");
const trustscore = require("../trustscore.js");

const emailVerification = require("./emailVerification.js");

const { customAlphabet } = require("nanoid");
const generateuserid = customAlphabet(
  config.user.idalphabet,
  config.user.idlength
);

async function registerUser(userEmail, userUsername, userPassword, oauthData) {
  let emailinfo = await email.getemailinfo(userEmail);
  let userid = generateuserid();
  let currentDate = new Date();

  if (!userUsername) {
    // If no username is provided, use userid as username
    userUsername = userid.toString();
  }

  return new Promise(function (resolve, reject) {
    // Gets email info:
    // Generates salt with defined salt rounds in config:
    bcrypt.genSalt(config.user.bcryptsaltrounds, function (err, salt) {
      // Hashes password:
      bcrypt.hash(userPassword, salt, function (err, hashedPassword) {
        //Stores user in DB:
        let newUser = new db.user({
          userid: userid,
          username: {
            displayusername: userUsername,
            realusername: userUsername?.toLowerCase(),
          },
          email: {
            email: emailinfo.realemail,
            verified: false,
          },
          password: hashedPassword,
          creationDate: currentDate,
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
            default:
              break;
          }
          newUser.account_connections.push({
            provider: oauthData.provider,
            data: oauthData.data,
          });
        }
        newUser
          .save()
          .then((registeredUser) => {
            if (config.user.captchaenabled == true) {
              trustscore.trustAction(
                registeredUser.userid,
                "completedCaptcha",
                { captcha: "User registration captcha" }
              );
            }
            // Created user successfully

            // Send email verification token (if not verified already):
            if (registeredUser.email.verified == false) {
              emailVerification
                .generateEmailVerificationToken(
                  registeredUser.userid,
                  registeredUser.email.email
                )
                .then((emailVerificationToken) => {
                  console.log(
                    "Created user " +
                      registeredUser.userid +
                      ", username " +
                      registeredUser.username.displayusername +
                      " email " +
                      registeredUser.email.email +
                      "."
                  );
                  resolve(registeredUser);
                });
            } else {
              console.log(
                "Created user " +
                  registeredUser.userid +
                  ", username " +
                  registeredUser.username.displayusername +
                  " email " +
                  registeredUser.email.email +
                  "."
              );
              resolve(registeredUser);
            }
          })
          .catch((err) => {
            console.log(err);
            console.log("Failed to register user.");
            if (err.code == 11000) {
              console.log(emailinfo.realemail);
              if (
                Object.keys(err.keyValue) == "email.email" ||
                Object.keys(err.keyValue) == "emailhistory.email"
              ) {
                // Already existing current or past email
                console.log("Email already exists");
                reject("Email already exists");
              } else if (
                Object.keys(err.keyValue) == "username.displayusername" ||
                Object.keys(err.keyValue) == "username.realusername"
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

module.exports = { registerUser };
