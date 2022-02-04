const passport = require("passport");
const config = require("../../config.js");
const oauth = require("./oauth.js");

const FacebookStrategy = require("passport-facebook").Strategy;

// Facebook Auth:

if (config.user.facebook_client_id && config.user.facebook_client_secret) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: config.user.facebook_client_id,
        clientSecret: config.user.facebook_client_secret,
        callbackURL: config.fqdn + "/auth/facebook/callback",
        scope: ["public_profile", "email"],
        enableProof: true,
        passReqToCallback: true,
        profileFields: ["id", "emails", "name"],
      },
      async function (request, access_token, refresh_token, profile, done) {
        try {
          var user = oauth(request, profile, "Facebook");
        } catch (error) {
          return done(error, null);
        }
        return done(null, user);
      }
    )
  );
}
