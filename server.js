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
const methodOverride = require("method-override");
const register = require("./auth/register.js");
const passwordReset = require("./auth/passwordReset.js");
const emailVerification = require("./auth/emailVerification.js");
const newIP = require("./auth/newIP.js");
const passwordResetConfirmationEmail = require("./email/templates/passwordResetConfirmation.js");
const issuejwt = require("./auth/issueJWT.js");
const rateLimit = require("express-rate-limit");

const hcaptcha = require("hcaptcha");
const recaptcha = require("./util/reCAPTCHA.js");

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

const otp = require("otplib");
const { isNullOrUndefined } = require("util");

if (config.usingproxy) {
  app.set("trust proxy", 1);
}

app.use(passport.initialize());
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

// MIDDLEWARES:

async function checkCaptcha(req, res, next) {
  let captchaResponse =
    req.body["h-captcha-response"] || req.body["g-captcha-response"];
  let captchaType;

  if (!config.hcaptcha.enabled && !config.recaptcha.enabled) {
    // If captcha is disabled, continue.
    return next();
  }

  if (
    captchaResponse === config.captchasecretbypasskey &&
    config.captchasecretbypasskeyenabled == true
  ) {
    // If using the bypass key and it is enabled, skip the captcha check.
    return next();
  }

  if (
    req.body["h-captcha-response"] != null &&
    req.body["h-captcha-response"] != undefined &&
    req.body["h-captcha-response"] != ""
  ) {
    captchaType = "hcaptcha";
  } else if (
    req.body["g-captcha-response"] != null &&
    req.body["g-captcha-response"] != undefined &&
    req.body["g-captcha-response"] != ""
  ) {
    captchaType = "recaptcha";
  } else {
    return res.status(400).json({
      error: true,
      message: "No CAPTCHA response provided",
    });
  }

  if (captchaType === "hcaptcha") {
    if (!config.hcaptcha.enabled) {
      return res.status(400).json({
        error: true,
        message: "hCaptcha is not enabled",
      });
    }
    hcaptcha
      .verify(config.hcaptcha.secret, captchaResponse)
      .then((data) => {
        if (data.success) {
          // If the captcha is valid, continue.
          return next();
        }
        // Captcha is invalid.
        return res.status(409).json({
          error: true,
          message: "CAPTCHA Incorrect",
        });
      })
      .catch((err) => {
        return res.status(500).json({
          error: true,
          message: "CAPTCHA Error",
        });
      });
  }

  if (captchaType === "recaptcha") {
    if (!config.recaptcha.enabled) {
      return res.status(400).json({
        error: true,
        message: "reCAPTCHA is not enabled",
      });
    }
    recaptcha
      .verify(config.recaptcha.secret, captchaResponse)
      .then((data) => {
        if (data.success) {
          // If the captcha is valid, continue.
          return next();
        }
        // Captcha is invalid.
        return res.status(409).json({
          error: true,
          message: "CAPTCHA Incorrect",
        });
      })
      .catch((err) => {
        return res.status(500).json({
          error: true,
          message: "CAPTCHA Error",
        });
      });
  }
}

// RATE LIMITING:

config.ratelimits.forEach((ratelimit) => {
  app.use(
    ratelimit.route,
    rateLimit({
      windowMs: ratelimit.window,
      max: ratelimit.maxrequests,
    })
  );
});

app.post("/auth/login", checkCaptcha, (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        // Error or no user
        error = new Error(err);
        return res.status(403).json({ error: true, message: info.message });
      }

      if (user["2FA"].active) {
        if (!req.body.totpCode) {
          return res.status(403).json({
            error: true,
            message: "2FA is active but no code was provided",
          });
        }
        if (!otp.authenticator.check(req.body.totpCode, user["2FA"].secret)) {
          return res
            .status(403)
            .json({ error: true, message: "Incorrect TOTP code" });
        }
      }

      let isnewIP;
      for (let i = 0; i < user.userIPs.length; i++) {
        if (user.userIPs[i].ip === req.ip) {
          // If this IP is already in the userIPs list.
          isnewIP = false; // Set isnewIP to false.
          if (!user.userIPs[i].authorized) {
            // If the IP already exists in the database, but is not authorized
            return res.json({
              error: true,
              message: "IP address not authorized",
            });
          }
        }
      }
      if (isnewIP != false) {
        // If the IP is not in the userIPs list, generated newIP token (It will also add it to the usersIP array as unauthorized)
        return await newIP
          .generateNewIPToken(user.userid, user.email.email, req.ip)
          .then(() => {
            res.json({
              error: false,
              message: "New IP address, authorization required",
            });
          });
      }

      req.login(user, { session: false }, async (err) => {
        if (err) return res.status(403).json({ error: true, message: "Error" });
        issuejwt
          .issueRefreshJWT(user.userid, user.email.email)
          .then((tokens) => {
            return res.json({
              error: false,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            });
          });
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: true, message: "Error" });
    }
  })(req, res, next);
});

app.post("/auth/refreshToken", async (req, res) => {
  db.refreshToken
    .findOne({ token: req.body.refreshToken })
    .then((refreshToken) => {
      if (refreshToken) {
        if (refreshToken.expired) {
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
                issuejwt
                  .issueAccessJWT(refreshToken.userid, refreshToken.email)
                  .then((token) => {
                    res
                      .status(200)
                      .json({ error: false, accessToken: token.accessToken });
                  });
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

app.post("/auth/requestPasswordReset", checkCaptcha, (req, res) => {
  passwordReset
    .generatePasswordResetToken(req.body.email)
    .then((passwordResetToken) => {
      return res.status(200).json({
        error: false,
        message: "Password reset email sent",
      });
    })
    .catch((error) => {
      if (error === "No such user") {
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

app.post("/auth/verifyEmail/:emailVerificationToken?", async (req, res) => {
  jwt.verify(
    req.params["emailVerificationToken"] || req.body.emailVerificationToken,
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
            req.params["emailVerificationToken"] ||
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

app.post("/auth/register", checkCaptcha, async (req, res) => {
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

  await register
    .registerUser(
      req.body.email.toLowerCase(),
      req.body.username,
      req.body.password,
      null,
      req.ip // No need to worry about x-forwarded-for since express will use that automatically when behind a proxy. (As long as config.usingproxy is set to true)
    )
    .then((registeredUser) => {
      issuejwt
        .issueRefreshJWT(registeredUser.userid, registeredUser.email.email)
        .then((tokens) => {
          res.status(201).json({
            error: false,
            message: "User registered successfully",
            user: {
              userid: registeredUser.userid,
              username: registeredUser.username.displayusername,
              email: registeredUser.email.email,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
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
        default:
          break;
      }
    });
});

app.post("/auth/authorizeNewIP", async (req, res) => {
  jwt.verify(
    req.body.newIPToken,
    config.user.jwtnewipsecret,
    (err, verifiedToken) => {
      if (err) {
        return res.status(401).json({
          error: true,
          message: "Tampered or invalid token",
        });
      } else {
        newIP
          .checkNewIPToken(
            verifiedToken.userid,
            verifiedToken.ip,
            req.body.newIPToken
          )
          .then((user) => {
            return res.status(200).json({
              error: false,
              message: "New IP address authorized successfully",
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

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    issuejwt
      .issueRefreshJWT(req.user.userid, req.user.email.email)
      .then((tokens) => {
        return res.json({
          error: false,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      });
  }
);

app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["profile", "email", "user:email"] })
  // https://stackoverflow.com/questions/35373995/github-user-email-is-null-despite-useremail-scope
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { session: false }),
  (req, res) => {
    issuejwt
      .issueRefreshJWT(req.user.userid, req.user.email.email)
      .then((tokens) => {
        return res.json({
          error: false,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      });
  }
);

app.get(
  "/auth/discord",
  passport.authenticate("discord", { scope: ["identify", "email"] })
);

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { session: false }),
  (req, res) => {
    issuejwt
      .issueRefreshJWT(req.user.userid, req.user.email.email)
      .then((tokens) => {
        return res.json({
          error: false,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      });
  }
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["public_profile", "email"] })
);

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  (req, res) => {
    issuejwt
      .issueRefreshJWT(req.user.userid, req.user.email.email)
      .then((tokens) => {
        return res.json({
          error: false,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      });
  }
);

app.post(
  "/user/changeEmail",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    if (!config.user.emailregex.test(req.body.email.toLowerCase())) {
      return res.status(400).json({
        error: true,
        message: "Invalid email",
      });
    }
    emailVerification
      .generateEmailVerificationToken(req.user._id, req.body.email)
      .then((emailVerificationToken) => {
        res.status(200).json({
          error: false,
          message: "Email verification sent successfully",
        });
      })
      .catch((err) => {
        res.status(400).json({ error: true, message: err });
      });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: false, message: err });
  }
);

app.post(
  "/user/changePassword",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    if (req.body.oldPassword === req.body.newPassword) {
      return res.status(403).json({
        error: true,
        message: "Password cannot be the same",
      });
    }
    if (!config.user.passwordregex.test(req.body.newPassword)) {
      return res.status(403).json({
        error: true,
        message: "Invalid Password",
      });
    }
    db.user.findOne({ userid: req.user._id }).then((user) => {
      bcrypt.compare(req.body.oldPassword, user.password).then((results) => {
        if (results) {
          // Generates Salt:
          bcrypt.genSalt(config.user.bcryptsaltrounds, function (err, salt) {
            // Hashes password:
            bcrypt.hash(
              req.body.newPassword,
              salt,
              function (err, hashedPassword) {
                db.user
                  .updateOne(
                    { userid: req.user._id },
                    { $set: { password: hashedPassword } }
                  )
                  .then((newUser) => {
                    passwordResetConfirmationEmail
                      .sendPasswordChangeConfirmationEmail(user.email)
                      .then((emailInfo) => {
                        return res.status(200).json({
                          error: false,
                          message: "Password changed successfully",
                        });
                      });
                  })
                  .catch((err) => {
                    return res.status(500).json({
                      error: true,
                      message: "Unknown Error",
                    });
                  });
              }
            );
          });
        } else {
          return res.status(403).json({
            error: true,
            message: "Incorrect password",
          });
        }
      });
    });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: false, message: err });
  }
);

app.post(
  "/user/request2FAsecret",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    db.user.findOne({ userid: req.user._id }).then((user) => {
      if (user["2FA"] != undefined) {
        if (user["2FA"].active) {
          return res.status(403).json({
            error: true,
            message: "2FA is already enabled",
          });
        }
      }
      secret = otp.authenticator.generateSecret();
      db.user
        .updateOne(
          { userid: req.user._id },
          {
            $set: {
              "2FA": { active: false, secret: secret },
            },
          }
        )
        .then((updatedUser) => {
          return res.status(200).json({
            error: false,
            totpSecret: secret,
          });
        });
    });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: false, message: err });
  }
);

app.post(
  "/user/activate2FA",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    db.user.findOne({ userid: req.user._id }).then((user) => {
      if (user["2FA"] === undefined) {
        return res.status(403).json({
          error: true,
          message: "2FA secret not requested",
        });
      }
      if (user["2FA"].active) {
        return res.status(403).json({
          error: true,
          message: "2FA is already enabled",
        });
      }
      if (otp.authenticator.check(req.body.totpCode, user["2FA"].secret)) {
        // If the totp code provided by the user matches the one generated by the secret in the db.
        db.user
          .updateOne({ userid: req.user._id }, { $set: { "2FA.active": true } })
          .then((updatedUser) => {
            // Set 2FA as active
            return res.status(200).json({
              error: false,
              message: "2FA activated successfully",
            });
          });
      } else {
        return res.status(403).json({
          error: false,
          message: "Incorrect TOTP code",
        });
      }
    });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: false, message: err });
  }
);

app.post(
  "/user/disable2FA",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {
    db.user.findOne({ userid: req.user._id }).then((user) => {
      if (user["2FA"]?.active != true) {
        return res.status(403).json({
          error: true,
          message: "2FA is not enabled",
        });
      }

      if (otp.authenticator.check(req.body.totpCode, user["2FA"].secret)) {
        // If the totp code provided by the user matches the one generated by the secret in the db.
        db.user
          .updateOne(
            { userid: req.user._id },
            { $set: { "2FA.active": false } }
          )
          .then((updatedUser) => {
            // Set 2FA as inactive
            return res.status(200).json({
              error: false,
              message: "2FA disabled successfully",
            });
          });
      } else {
        return res.status(403).json({
          error: false,
          message: "Incorrect TOTP code",
        });
      }
    });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: false, message: err });
  }
);

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
