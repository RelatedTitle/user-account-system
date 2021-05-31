const passport = require("passport");
const config = require("../../config.js");
const db = require("../../db/db.js");
const email = require("../../email/email.js");
const register = require("../register.js");

const DiscordStrategy = require("passport-discord").Strategy;

// Discord Auth:

passport.use(
  new DiscordStrategy(
    {
      clientID: config.user.discordclientid,
      clientSecret: config.user.discordclientsecret,
      callbackURL: config.fqdn + "/auth/discord/callback",
      passReqToCallback: true,
      scope: ["identify", "email"],
    },
    async function (request, accessToken, refreshToken, profile, done) {
      if (!profile.email) {
        // User's email address(es) is(are) private or inaccessible for some other reason
        return done("Email address private or inaccessible", null);
      }
      emailinfo = await email.getemailinfo(profile.email);
      db.user.findOne({ "oauth.discordoauthid": profile.id }).then((user) => {
        if (user) {
          // User found:
          return done(null, user);
        } else {
          // Register a new user (only automatically verifies the user's email if it is verified on Discord, for some dumb reason they allow unverified users to use oauth):
          register
            .registerUser(profile.email, profile.username, null, {
              provider: "Discord",
              data: profile,
            })
            .then((newUser) => {
              return done(null, newUser);
            })
            .catch((err) => {
              if (
                err == "Email already exists" ||
                err == "Username already exists"
              ) {
                // If user account already exists, link it to their Discord account (also automatically verifies the user's email, not emailhistory though ONLY IF DISCORD EMAIL IS VERIFIED):
                profile.email = emailinfo.realemail; // Use sanitized email
                if (!profile.verified) {
                  return done(
                    "Unable to link this Discord account to an existing account since the Discord account's email is unverified",
                    null
                  );
                } else {
                  db.user
                    .findOneAndUpdate(
                      { "email.email": profile.email },
                      {
                        $set: {
                          "oauth.discordoauthid": profile.id,
                          "email.verified": true,
                        },
                        $push: {
                          account_connections: {
                            provider: "Discord",
                            data: profile,
                          },
                        },
                      }
                    )
                    .then((updatedUser) => {
                      if (!updatedUser) {
                        // Username belonged to another account
                        register
                          .registerUser(profile.email, null, null, {
                            provider: "Discord",
                            data: profile,
                          })
                          .then((newUser) => {
                            return done(null, newUser);
                          });
                      }
                      // updateOne does not return the full updated document so we use need to use findOneAndUpdate
                      return done(null, updatedUser);
                    });
                }
              } else {
                // Some other error
                console.log(err);
                return done("Unknown Error", null);
              }
            });
        }
      });
    }
  )
);
