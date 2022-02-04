const passport = require("passport");
const config = require("../../config.js");
const oauth = require("./oauth.js");

const GitHubStrategy = require("passport-github2").Strategy;

// Github Auth:

if (config.user.github_client_id && config.user.github_client_secret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.user.github_client_id,
        clientSecret: config.user.github_client_secret,
        callbackURL: config.fqdn + "/auth/github/callback",
        passReqToCallback: true,
      },
      async function (request, access_token, refresh_token, profile, done) {
        try {
          var user = oauth(request, profile, "GitHub");
        } catch (error) {
          return done(error, null);
        }
        return done(null, user);
      }
    )
  );
}
