const passport = require("passport");
const jwt = require("jsonwebtoken");
const config = require("../../config.js");
const db = require("../../db/db.js");
const email = require("../../email/email.js");
const register = require("../register.js");
const link_account = require("./link_account.js").link_account;
const link_account_email = require("./link_account.js").link_account_email;

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
      if (request.query.state) {
        // If an access token is provided (the user is linking their account)
        jwt.verify(
          request.query.state,
          config.user.jwt_auth_secret,
          (err, token) => {
            if (err) {
              return done("Tampered or invalid token");
            }
            if (
              Math.round(Date.now() / 1000) - token.iat >=
              config.user.jwt_access_token_expiration
            ) {
              return done("Token expired");
            } else {
              if (token.type != "access") {
                return done("Incorrect token type");
              } else {
                // Authenticated
                db.user
                  .findOne({ id: token.userid })
                  .then((user) => {
                    link_account(user, profile, "GitHub")
                      .then((linked_user) => {
                        return done(null, linked_user);
                      })
                      .catch((err) => {
                        return done(err);
                      });
                  })
                  .catch((err) => {
                    return done(err);
                  });
              }
            }
          }
        );
      } else {
        email_info = await email.get_email_info(profile.emails[0].value);
        db.user.findOne({ "oauth.githuboauthid": profile.id }).then((user) => {
          if (user) {
            // User found:
            return done(null, user);
          } else {
            // Register a new user (also automatically verifies the user's email):
            register
              .register_user(profile.emails[0].value, null, null, {
                provider: "GitHub",
                data: profile,
              })
              .then((new_user) => {
                return done(null, new_user);
              })
              .catch((err) => {
                if (err === "Email already exists") {
                  // If user account already exists, link it to their GitHub account (also automatically verifies the user's email if necessary)
                  link_account_email(profile, "GitHub")
                    .then((linked_user) => {
                      return done(null, linked_user);
                    })
                    .catch((err) => {
                      return done(err);
                    });
                } else {
                  // Some other error
                  return done("Unknown Error", null);
                }
              });
          }
        });
      }
    }
  )
);
