const config = require("../config.js");
const db = require("../db.js");
const email = require("../email/email.js");
const bcrypt = require("bcrypt");
const trustscore = require("../trustscore.js");

async function registerUser(userEmail, userUsername, userPassword) {
  let emailinfo = await email.getemailinfo(userEmail);
  return new Promise(function (resolve, reject) {
    // if (!config.user.emailregex.test(userEmail)) {
    //   res.status(400).json({
    //     error: true,
    //     message: "Invalid Email",
    //   });
    // }

    // if (!config.user.usernameregex.test(userUsername)) {
    //   res.status(400).json({
    //     error: true,
    //     message: "Invalid Username",
    //   });
    // }
    // Gets email info:
    // Generates salt with defined salt rounds in config:
    bcrypt.genSalt(config.user.bcryptsaltrounds, function (err, salt) {
      // Hashes password:
      bcrypt.hash(userPassword, salt, function (err, hashedPassword) {
        //Stores user in DB:
        db.createuser(userUsername, emailinfo.realemail, hashedPassword)
          .then((registeredUser) => {
            if (config.user.captchaenabled == true) {
              trustscore.trustAction(
                registeredUser.userid,
                "completedCaptcha",
                { captcha: "User registration captcha" }
              );
            }
            // Created user successfully
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
          })
          .catch((err) => {
            console.log(err);
            console.log("Failed to register user.");
            if (err.code == 11000) {
              if (
                Object.keys(err.keyValue) == "username.displayusername" ||
                Object.keys(err.keyValue) == "username.realusername"
              ) {
                // Already existing username
                console.log("Username " + userUsername + " already exists.");
                reject("Username already exists");
              } else if (
                Object.keys(err.keyValue) == "email.email" ||
                Object.keys(err.keyValue) == "emailhistory.email"
              ) {
                // Already existing current or past email
                console.log(
                  "Email " + emailinfo.realemail + " already exists."
                );
                reject("Email already exists");
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
