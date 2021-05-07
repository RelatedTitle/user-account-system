const trustscore = require("./trustscore.js");
const email = require("./email/email.js");
const passwordReset = require("./passwordReset.js");

// trustscore
//   .trustAction(7110768909, "contentRemoved", {
//     contentid: 42069,
//     reason: "Said cheeses are bad, which is objectively false.",
//     customPointChange: -10000,
//   })
//   .then((updatedUser) => {
//     console.log("SUCCESS: " + JSON.stringify(updatedUser));
//   })
//   .catch((err) => {
//     console.log("ERR: " + err);
//   });

// email
//   .generateEmailVerificationToken(320379237, "Dillan33@yahoo.com")
//   .then((token) => {
//     console.log(token);
//   });

// email
//   .checkEmailVerificationToken(
//     1662658861,
//     "Nola24@gmail.com",
//     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOjE2NjI2NTg4NjEsImVtYWlsIjoiTm9sYTI0QGdtYWlsLmNvbWEiLCJpYXQiOjE2MTk5MjA4OTl9.A6TsYoiXM83GOZ6SCEkDqbFaNMRPTLo2_p2A_ZNDeWc"
//   )
//   .then((data) => {
//     console.log("Correct token.");
//   })
//   .catch((err) => {
//     console.log("ERR: " + err);
//   });

// passwordReset
//   .generatePasswordResetToken("talia_zboncak86@gmail.com")
//   .then((token) => {
//     console.log("Success " + token);
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// passwordReset
//   .checkPasswordResetToken(
//     "talia_zboncak86@gmail.com",
//     "1231231234",
//     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRhbGlhX3pib25jYWs4NkBnbWFpbC5jb20iLCJpYXQiOjE2MjAwMDQ5MDV9.6X3lWt7I0aoaVczp1oi6HV2B_YjNkIPa-NIlAOp6v04"
//   )
//   .then((user) => {
//     console.log(user);
//   })
//   .catch((err) => {
//     console.log(err);
//   });
