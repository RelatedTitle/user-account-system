// const LocalStrategy = require("passport-local").Strategy;
// const bcrypt = require("bcrypt");

// async function initialize(passport, getUserByEmail, getUserById) {
//   const authenicateUser = async (email, password, done) => {
//     const dbuser = await getUserByEmail(email);
//     if (dbuser == null) {
//       return done(null, false, {
//         message: "There are no users with that email.",
//       });
//     }
//     const user = {
//       username: dbuser.username.realusername,
//       email: dbuser.email.email,
//       password: dbuser.password,
//       id: dbuser.userid,
//     };
//     try {
//       if (await bcrypt.compare(password, user.password)) {
//         return done(null, user);
//       } else {
//         return done(null, false, { message: "Password incorrect." });
//       }
//     } catch (err) {
//       return done(err);
//     }
//   };
//   passport.use(new LocalStrategy({ usernameField: "email" }, authenicateUser));
//   passport.serializeUser((user, done) => done(null, user.id));
//   passport.deserializeUser((id, done) => {
//     return done(null, getUserById(id));
//   });
// }

// module.exports = initialize;
