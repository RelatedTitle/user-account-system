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
const passport = require("passport");
const methodOverride = require("method-override");
const rateLimit = require("express-rate-limit");

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

app.listen(80);

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

app.use(change_email);
app.use(change_password);

// 2FA:
const activate_2FA = require("./api/user/2FA/activate_2FA.js");
const disable_2FA = require("./api/user/2FA/disable_2FA.js");
const request_2FA_secret = require("./api/user/2FA/request_2FA_secret.js");

app.use(activate_2FA);
app.use(disable_2FA);
app.use(request_2FA_secret);

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
