const passport = require("passport");
const config = require("../../config.js");
const oauth = require("./oauth.js");

const DiscordStrategy = require("passport-discord").Strategy;

// Discord Auth:

if (config.user.discord_client_id && config.user.discord_client_secret) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: config.user.discord_client_id,
        clientSecret: config.user.discord_client_secret,
        callbackURL: config.fqdn + "/auth/discord/callback",
        passReqToCallback: true,
        scope: ["identify", "email"],
      },
      async function (request, access_token, refresh_token, profile, done) {
        oauth(request, profile, "Discord")
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
