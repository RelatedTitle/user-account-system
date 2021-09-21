const passport = require("passport");
const config = require("../../config.js");
const oauth = require("./oauth.js");

const GitHubStrategy = require("passport-github2").Strategy;

// Github Auth:

passport.use(
  new GitHubStrategy(
    {
      clientID: config.user.github_client_id,
      clientSecret: config.user.github_client_secret,
      callbackURL: config.fqdn + "/auth/github/callback",
      passReqToCallback: true,
    },
    async function (request, access_token, refresh_token, profile, done) {
      oauth(request, profile, "GitHub")
        .then((user) => {
          return done(null, user);
        })
        .catch((error) => {
          return done(error, null);
        });
    }
  )
);
