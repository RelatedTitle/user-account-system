const passport = require("passport");
const config = require("../../config.js");
const db = require("../../db/db.js");
const email = require("../../email/email.js");
const register = require("../register.js");

const GoogleStrategy = require("passport-google-oauth2").Strategy;

// Google Auth:
passport.use(
  new GoogleStrategy(
    {
      clientID: config.user.googleclientid,
      clientSecret: config.user.googleclientsecret,
      callbackURL: config.fqdn + "/auth/google/callback",
      passReqToCallback: true,
    },
    async function (request, accessToken, refreshToken, profile, done) {
      if (!profile.email) {
        // User's email address(es) is(are) private or inaccessible for some other reason
        return done("Email address private or inaccessible", null);
      }
      emailinfo = await email.getemailinfo(profile.email);
      db.user.findOne({ "oauth.googleoauthid": profile.id }).then((user) => {
        if (user) {
          // User found:
          return done(null, user);
        } else {
          // Register a new user (also automatically verifies the user's email):
          register
            .registerUser(profile.email, null, null, {
              provider: "Google",
              data: profile,
            })
            .then((newUser) => {
              return done(null, newUser);
            })
            .catch((err) => {
              if (err == "Email already exists") {
                // If user account already exists, link it to their Google account (also automatically verifies the user's email, not emailhistory though):
                profile.email.value = emailinfo.realemail;
                db.user
                  .findOneAndUpdate(
                    { "email.email": profile.email },
                    {
                      $set: {
                        "oauth.googleoauthid": profile.id,
                        "email.verified": true,
                      },
                      $push: {
                        account_connections: {
                          provider: "Google",
                          data: profile,
                        },
                      },
                    }
                  )
                  .then((updatedUser) => {
                    // updateOne does not return the full updated document so we use need to use findOneAndUpdate

                    return done(null, updatedUser);
                  });
              } else {
                // Some other error
                return done("Unknown Error", null);
              }
            });
        }
      });
    }
  )
);
