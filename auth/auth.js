const db = require("../db/db.js");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const config = require("../config.js");
const register = require("./register.js");
const email = require("../email/email.js");

const JWTStrategy = require("passport-jwt").Strategy;
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const GitHubStrategy = require("passport-github").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const ExtractJWT = require("passport-jwt");

// Login:
passport.use(
  "login",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        let currentUser = await db.user.findOne({
          "email.email": email.toLowerCase(),
        });
        if (currentUser) {
          // User found
          if (await bcrypt.compare(password, currentUser.password)) {
            // Password Correct
            return done(null, currentUser, { message: "Login was successful" });
          } else {
            // Password Incorrect
            console.log("Incorrect pass");
            return done(null, false, { message: "Password Incorrect" });
          }
        } else {
          // User Not found
          console.log("User not found");
          return done(null, false, { message: "User not found" });
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// JWT Token Verification:
passport.use(
  new JWTStrategy(
    {
      secretOrKey: config.user.jwtauthsecret,
      jwtFromRequest: ExtractJWT.ExtractJwt.fromExtractors([
        ExtractJWT.ExtractJwt.fromUrlQueryParameter("secret_token"),
        ExtractJWT.ExtractJwt.fromHeader("secret_token"),
        ExtractJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
    },
    // https://stackoverflow.com/questions/53880503/passport-jwt-strategy-extracting-options
    async (token, done) => {
      try {
        if (
          Math.round(Date.now() / 1000) - token.iat >=
          config.user.jwtaccesstokenexpiration
        ) {
          return done("Token expired");
        } else {
          if (token.type != "access") {
            return done("Incorrect token type");
          } else {
            return done(null, token.user);
          }
        }
      } catch (err) {
        done(error);
      }
    }
  )
);

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

// Github Auth:

passport.use(
  new GitHubStrategy(
    {
      clientID: config.user.githubclientid,
      clientSecret: config.user.githubclientsecret,
      callbackURL: config.fqdn + "/auth/github/callback",
      passReqToCallback: true,
    },
    async function (request, accessToken, refreshToken, profile, done) {
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
                err == "Email already exists" ||
                err == "Username already exists"
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
                      // Existing username belonged to another account
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
                if (!profile.emails) {
                  // User's email address(es) is(are) private or inaccessible for some other reason
                  return done("Email address private or inaccessible", null);
                } else {
                  // Some other error
                  console.log(err);
                  return done("Unknown Error", null);
                }
              }
            });
        }
      });
    }
  )
);

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
                        // Existing username belonged to another account
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
                if (!profile.email) {
                  // User's email address(es) is(are) private or inaccessible for some other reason
                  return done("Email address private or inaccessible", null);
                } else {
                  // Some other error
                  console.log(err);
                  return done("Unknown Error", null);
                }
              }
            });
        }
      });
    }
  )
);
