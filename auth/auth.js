const db = require("../db/db.js");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const config = require("../config.js");
const register = require("./register.js");

const JWTStrategy = require("passport-jwt").Strategy;
const GoogleStrategy = require("passport-google-oauth2").Strategy;
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
        console.log(Math.round(Date.now() / 1000) - token.iat);
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
    function (request, accessToken, refreshToken, profile, done) {
      db.user.findOne({ oauth: { googleoauthid: profile.id } }).then((user) => {
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
                db.user
                  .updateOne(
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
                  .then((newUser) => {
                    return done(null, newUser);
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
