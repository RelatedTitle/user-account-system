const db = require("../db/db.js");
const passport = require("passport");
const bcrypt = require("bcrypt");
const config = require("../config.js");
const register = require("./register.js");
const email = require("../email/email.js");

const localStrategy = require("passport-local").Strategy;
const JWTStrategy = require("passport-jwt").Strategy;

// OAuth:

require("./oauth/google.js");
require("./oauth/github.js");
require("./oauth/facebook.js");
require("./oauth/discord.js");

const ExtractJWT = require("passport-jwt");

// Login:
passport.use(
  "login",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (user_email, password, done) => {
      try {
        let current_user = await db.user.findOne({
          where: {
            email: email.get_email_info(user_email).realemail,
          },
        });
        if (current_user) {
          // User found
          if (await bcrypt.compare(password, current_user.password)) {
            // Password Correct
            return done(null, current_user, {
              message: "Login was successful.",
            });
          } else {
            // Password Incorrect
            return done(null, false, { message: "Password Incorrect." });
          }
        } else {
          // User Not found
          return done(null, false, { message: "User not found." });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);

// JWT Token Verification:
passport.use(
  new JWTStrategy(
    {
      secretOrKey: config.user.jwt_auth_secret,
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
          config.user.jwt_access_token_expiration
        ) {
          return done("Access token expired.");
        } else {
          if (token.type != "access") {
            return done(
              `Incorrect token type. Expected "access", got "${token.type}."`
            );
          } else {
            user = token.user;
            user.refresh_token = token.refresh_token;
            return done(null, user);
          }
        }
      } catch (error) {
        done(error);
      }
    }
  )
);
