const passport = require("passport");
const config = require("../../config.js");
const oauth = require("./oauth.js");

const GoogleStrategy = require("passport-google-oauth2").Strategy;

// Google Auth:

if (config.user.google_client_id && config.user.google_client_secret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.user.google_client_id,
        clientSecret: config.user.google_client_secret,
        callbackURL: config.fqdn + "/auth/google/callback",
        passReqToCallback: true,
      },
      async function (request, access_token, refresh_token, profile, done) {
        oauth(request, profile, "Google")
          .then((user) => {
            return done(null, user);
          })
          .catch((error) => {
            return done(error, null);
          });
      }
    )
  );
}
