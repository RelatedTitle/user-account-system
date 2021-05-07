// Add trust for each completed captcha.
// Add/Remove trust depending on IP provider. (Geniune ISP, Cloud Provider (Could Be used for bots), VPN, TOR, etc.)
// Add confirmed residential IP or other
// Add trust depending on user acc (Personal, Premium, Enterprise)
// Add/Remove trust depending on email acc (Depending on provider and their difficulty to get an account on, disposable, etc)
// Add/Remove trust depending on their contributions or bans/punishments.
// Remove trust depending on the # malicious links they have posted
// Ability to manually add score/verify users.
// Add trust when a user verifies their email.
// Add trust depending on how human their actions are, things bots wouldn't do and depending on their user agent/etc.
// Require captchas for certain actions depending on a user's trust score.
// Disallow certain actions (like forum, etc) depending on a user's trust score.
// Sort the approval queue by people with higher trust scores.

// JWT Login based on https://www.youtube.com/watch?v=EcCIlxfxc4g
// Passport Registration based on Web Dev Simplified's video.

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const config = require("./config.js");

const request = require("request");
const fs = require("fs");
const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const register = require("./auth/register.js");
const passwordReset = require("./auth/passwordReset.js");
const emailVerification = require("./auth/emailVerification.js");

const { verify } = require("hcaptcha");

require("./auth/auth.js");

const app = express();
app.disable("x-powered-by");

const db = require("./db/db.js");
const email = require("./email/email.js");

const jwt = require("jsonwebtoken");
const { getMaxListeners } = require("process");
const { getemailinfo } = require("./email/email.js");
const { response } = require("express");
const { use } = require("passport");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));

app.listen(80);

app.get(
  "/dashboard",
  passport.authenticate("jwt", { session: false }),
  (req, res, next) => {
    // User is authenticated
    res.json({ Cheese: true });
  }
);

app.post("/auth/login", async (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        // Error or no user
        error = new Error(err);
        return res.status(403).json({ error: true, message: info.message });
      }

      req.login(user, { session: false }, async (err) => {
        if (err) return res.status(403).json({ error: true, message: "Error" });
        body = {
          _id: user.userid,
          email: user.email.email,
        };
        accessToken = jwt.sign(
          { user: body, type: "access" },
          config.user.jwtauthsecret
        );

        refreshToken = new db.refreshToken({
          userid: user.userid,
          email: user.email.email,
          token: jwt.sign(
            { user: body, type: "refresh" },
            config.user.jwtauthsecret
          ),
          expired: false,
        });
        refreshToken.save().then((refreshToken) => {
          return res.json({
            error: false,
            accessToken: accessToken,
            refreshToken: refreshToken.token,
          });
        });
      });
    } catch (err) {
      return res.status(500).json({ error: true, message: "Error" });
    }
  })(req, res, next);
});

app.post("/auth/refreshToken", async (req, res) => {
  db.refreshToken
    .findOne({ token: req.body.refreshToken })
    .then((refreshToken) => {
      if (refreshToken) {
        if (refreshToken.expired == true) {
          return res
            .status(401)
            .json({ error: true, message: "Token is expired" });
        } else {
          jwt.verify(
            refreshToken.token,
            config.user.jwtauthsecret,
            (err, verifiedToken) => {
              if (
                Math.round(Date.now() / 1000) - verifiedToken.iat >=
                config.user.jwtrefreshtokenexpiration
              ) {
                db.refreshToken
                  .updateOne(
                    { token: refreshToken.token },
                    { $set: { expired: true } }
                  )
                  .then((expiredToken) => {
                    res
                      .status(401)
                      .json({ error: true, message: "Token is expired" });
                  });
              } else {
                // Issue new access token:
                body = {
                  _id: refreshToken.userid,
                  email: refreshToken.email,
                };
                accessToken = jwt.sign(
                  { user: body, type: "access" },
                  config.user.jwtauthsecret
                );
                res
                  .status(200)
                  .json({ error: false, accessToken: accessToken });
              }
            }
          );
        }
      } else {
        return res
          .status(401)
          .json({ error: true, message: "No such valid token" });
      }
    });
});

app.post("/auth/requestPasswordReset", async (req, res) => {
  passwordReset
    .generatePasswordResetToken(req.body.email)
    .then((passwordResetToken) => {
      return res.status(200).json({
        error: false,
        message: "Password reset email sent",
      });
    })
    .catch((error) => {
      if (error == "No such user") {
        return res.status(200).json({
          error: false,
          message: "Password reset email sent",
        });
      } else {
        return res.status(500).json({
          error: false,
          message: "Error sending password reset email",
        });
      }
    });
});

app.post("/auth/resetPassword", async (req, res) => {
  if (!config.user.passwordregex.test(req.body.password)) {
    return res.status(400).json({
      error: true,
      message: "Invalid password",
    });
  }
  jwt.verify(
    req.body.passwordResetToken,
    config.user.jwtpasswordresetsecret,
    (err, verifiedToken) => {
      if (err) {
        return res.status(401).json({
          error: true,
          message: "Tampered or invalid token",
        });
      } else {
        passwordReset
          .checkPasswordResetToken(
            verifiedToken.email,
            req.body.password,
            req.body.passwordResetToken
          )
          .then((user) => {
            return res.status(200).json({
              error: false,
              message: "Password changed successfully",
            });
          })
          .catch((err) => {
            return res.status(401).json({
              error: true,
              message: err,
            });
          });
      }
    }
  );
});

app.post("/auth/verifyEmail", async (req, res) => {
  jwt.verify(
    req.body.emailVerificationtToken,
    config.user.jwtemailverificationsecret,
    (err, verifiedToken) => {
      if (err) {
        return res.status(401).json({
          error: true,
          message: "Tampered or invalid token",
        });
      } else {
        emailVerification
          .checkEmailVerificationToken(
            verifiedToken.userid,
            verifiedToken.email,
            req.body.emailVerificationToken
          )
          .then((user) => {
            return res.status(200).json({
              error: false,
              message: "Email verified successfully",
            });
          })
          .catch((err) => {
            return res.status(401).json({
              error: true,
              message: err,
            });
          });
      }
    }
  );
});

app.post("/auth/register", async (req, res) => {
  console.log("Registering user.");
  if (!req.body.email || !req.body.username || !req.body.password) {
    return res.status(400).json({
      error: true,
      message: "Your request is garbage.",
    });
  }

  if (!config.user.emailregex.test(req.body.email.toLowerCase())) {
    return res.status(400).json({
      error: true,
      message: "Invalid email",
    });
  }
  if (!config.user.usernameregex.test(req.body.username)) {
    return res.status(400).json({
      error: true,
      message: "Invalid username",
    });
  }
  if (!config.user.passwordregex.test(req.body.password)) {
    return res.status(400).json({
      error: true,
      message: "Invalid password",
    });
  }

  // Verifies HCaptcha:

  if (config.user.captchaenabled) {
    if (req.body["h-captcha-response"] == config.user.captchasecretbypasskey) {
      captchaComplete = true;
    } else {
      await verify(config.user.captchasecret, req.body["h-captcha-response"])
        .then((data) => {
          if (data.success) {
            console.log("CAPTCHA Correct");
            captchaComplete = true;
          } else {
            console.log("CAPTCHA Incorrect");
            captchaComplete = false;
            return res.status(409).json({
              error: true,
              message: "CAPTCHA Incorrect",
            });
          }
        })
        .catch((err) => {
          captchaComplete = false;
          console.log("CAPTCHA ERROR: " + err);
          return res.status(500).json({
            error: true,
            message: "CAPTCHA Error",
          });
        });
    }
  } else {
    captchaComplete = true;
  }

  if (captchaComplete == true) {
    await register
      .registerUser(
        req.body.email.toLowerCase(),
        req.body.username,
        req.body.password
      )
      .then((registeredUser) => {
        res.status(201).json({
          error: false,
          message: "User registered successfully",
          user: {
            userid: registeredUser.userid,
            username: registeredUser.username.displayusername,
            email: registeredUser.email.email,
          },
        });
      })
      .catch((error) => {
        switch (error) {
          case "Username already exists":
            res.status(409).json({
              error: true,
              message: "Username already exists",
            });
            break;
          case "Email already exists":
            res.status(409).json({
              error: true,
              message: "Email already exists",
            });
            break;
          case "Unknown error":
            res.status(500).json({
              error: true,
              message: "Unknown error",
            });
            break;
        }
      });
  }
});

const download = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on("close", callback);
  });
};

function updatedisposable() {
  download(
    "https://raw.githubusercontent.com/amieiro/disposable-email-domains/master/denyDomains.json",
    "email/disposabledomains.json",
    () => {
      // Downloads a disposable email domain list.
      console.log("Downloaded updated disposable email domain list");
    }
  );
}

// function checkAuth(req, res, next) {
//   if (req.isAuthenticated()) {
//     // If the user is authenticated, continue.
//     return next();
//   } else {
//     // Else, redirect to the login page.
//     res.redirect("/login");
//   }
// }

function checknotAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    // If the user is not authenticated, continue
    return next();
  } else {
    // Else, redirect to dashboard
    res.redirect("/dashboard");
  }
}
