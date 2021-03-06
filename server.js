if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const config = require("./config.js");

const express = require("express");
const passport = require("passport");
const methodOverride = require("method-override");
const rateLimit = require("express-rate-limit");
const error_handler = require("./api/middleware/error_handler.js");

require("./auth/auth.js");

const app = express();
app.disable("x-powered-by");

if (config.usingproxy) {
  app.set("trust proxy", 1);
}

app.use(passport.initialize());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));

// RATE LIMITING:

config.ratelimits.forEach((ratelimit) => {
  app.use(
    ratelimit.route,
    rateLimit({
      windowMs: ratelimit.window,
      max: ratelimit.maxrequests,
      message: {
        error: true,
        message: "Too many requests, please try again later.",
      },
    })
  );
});

// API:

// AUTH:
const login = require("./api/auth/login.js");
const register = require("./api/auth/register.js");
const refresh_token = require("./api/auth/refresh_token.js");
const authorize_new_IP = require("./api/auth/authorize_new_IP.js");
const verify_email = require("./api/auth/verify_email.js");
const request_password_reset = require("./api/auth/request_password_reset.js");
const reset_password = require("./api/auth/reset_password.js");

app.use(login);
app.use(register);
app.use(refresh_token);
app.use(authorize_new_IP);
app.use(verify_email);
app.use(request_password_reset);
app.use(reset_password);

// OAuth:
const discord = require("./api/auth/OAuth/discord.js");
const github = require("./api/auth/OAuth/github.js");
const google = require("./api/auth/OAuth/google.js");
const facebook = require("./api/auth/OAuth/facebook.js");

app.use(discord);
app.use(github);
app.use(google);
app.use(facebook);

// USER:
const change_email = require("./api/user/change_email.js");
const change_password = require("./api/user/change_password.js");
const change_avatar = require("./api/user/change_avatar.js");
const expire_token = require("./api/user/expire_token.js");

app.use(change_email);
app.use(change_password);
app.use(change_avatar);
app.use(expire_token);

// 2FA:
const activate_2FA = require("./api/user/2FA/activate_2FA.js");
const disable_2FA = require("./api/user/2FA/disable_2FA.js");
const request_2FA_secret = require("./api/user/2FA/request_2FA_secret.js");

app.use(activate_2FA);
app.use(disable_2FA);
app.use(request_2FA_secret);

// Static files

app.use(express.static("content"));

// ERROR HANDLING:
app.use(error_handler);
app.use(function (req, res, next) {
  res.status(404).send({ error: true, message: "Not found." });
});

module.exports = app.listen(config.port);
