const passport = require("passport");
const config = require("../../config.js");
const db = require("../../db/db.js");
const email = require("../../email/email.js");
const register = require("../register.js");

const FacebookStrategy = require("passport-facebook").Strategy;

// Facebook Auth:

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
      if (!profile.emails) {
        // User's email address(es) is(are) private or inaccessible for some other reason
        return done("Email address private or inaccessible", null);
      }
      email_info = await email.get_email_info(profile.emails[0].value);
      db.user.findOne({ "oauth.facebookoauthid": profile.id }).then((user) => {
        if (user) {
          // User found:
          return done(null, user);
        } else {
          // Register a new user (also automatically verifies the user's email):
          register
            .register_user(profile.emails[0].value, profile.username, null, {
              provider: "Facebook",
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
                // If user account already exists, link it to their Facebook account (also automatically verifies the user's email, not emailhistory though):
                profile.emails[0].value = email_info.realemail; // Use sanitized email
                db.user
                  .findOneAndUpdate(
                    { "email.email": profile.emails[0].value },
                    {
                      $set: {
                        "oauth.facebookoauthid": profile.id,
                        "email.verified": true,
                      },
                      $push: {
                        account_connections: {
                          provider: "Facebook",
                          data: profile,
                        },
                      },
                    }
                  )
                  .then((updated_user) => {
                    if (!updated_user) {
                      // Username belonged to another account
                      register
                        .register_user(profile.emails[0].value, null, null, {
                          provider: "Facebook",
                          data: profile,
                        })
                        .then((newUser) => {
                          return done(null, newUser);
                        });
                    }
                    // updateOne does not return the full updated document so we use need to use findOneAndUpdate
                    return done(null, updated_user);
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
