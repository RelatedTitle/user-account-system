const db = require("../db/db.js");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const config = require("../config.js");

const JWTStrategy = require("passport-jwt").Strategy;
const ExtractJWT = require("passport-jwt");

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
