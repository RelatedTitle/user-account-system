const passport = require("passport");
const config = require("../../config.js");
const db = require("../../db/db.js");
const email = require("../../email/email.js");
const register = require("../register.js");

const GitHubStrategy = require("passport-github").Strategy;

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
      if (!profile.emails) {
        // User's email address(es) is(are) private or inaccessible for some other reason
        return done("Email address private or inaccessible", null);
      }
      emailinfo = await email.getemailinfo(profile.emails[0].value);
      db.user.findOne({ "oauth.githuboauthid": profile.id }).then((user) => {
        if (user) {
          // User found:
          return done(null, user);
        } else {
          // Register a new user (also automatically verifies the user's email):
          register
            .registerUser(profile.emails[0].value, profile.username, null, {
              provider: "GitHub",
              data: profile,
            })
            .then((newUser) => {
              return done(null, newUser);
            })
            .catch((err) => {
              if (
                err === "Email already exists" ||
                err === "Username already exists"
              ) {
                // If user account already exists, link it to their GitHub account (also automatically verifies the user's email, not emailhistory though):
                profile.emails[0].value = emailinfo.realemail; // Use sanitized email
                db.user
                  .findOneAndUpdate(
                    { "email.email": profile.emails[0].value },
                    {
                      $set: {
                        "oauth.githuboauthid": profile.id,
                        "email.verified": true,
                      },
                      $push: {
                        account_connections: {
                          provider: "GitHub",
                          data: profile,
                        },
                      },
                    }
                  )
                  .then((updatedUser) => {
                    if (!updatedUser) {
                      // Username belonged to another account
                      register
                        .registerUser(profile.emails[0].value, null, null, {
                          provider: "GitHub",
                          data: profile,
                        })
                        .then((newUser) => {
                          return done(null, newUser);
                        });
                    }
                    // updateOne does not return the full updated document so we use need to use findOneAndUpdate
                    return done(null, updatedUser);
                  });
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
