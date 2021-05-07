const axios = require("axios");

testStart = Date.now();
console.log("[RelatedTechNetwork] Starting tests");

const { customAlphabet } = require("nanoid");
const generaterandom = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

const config = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

validUserData = new URLSearchParams({
  username: generaterandom(),
  email: generaterandom() + "@" + generaterandom() + ".com",
  password: generaterandom(),
  "h-captcha-response": "10000000-aaaa-bbbb-cccc-000000000001",
});

invalidEmailUserData = new URLSearchParams({
  username: generaterandom(),
  email: generaterandom(),
  password: generaterandom(),
  "h-captcha-response": "10000000-aaaa-bbbb-cccc-000000000001",
});

invalidUsernameUserData = new URLSearchParams({
  username: generaterandom() + "@#$%^&*()!-=..",
  email: generaterandom() + "@" + generaterandom() + ".com",
  password: generaterandom(),
  "h-captcha-response": "10000000-aaaa-bbbb-cccc-000000000001",
});

invalidCaptchaUserData = new URLSearchParams({
  username: generaterandom(),
  email: generaterandom() + "@" + generaterandom() + ".com",
  password: generaterandom(),
  "h-captcha-response": generaterandom(),
});

function registrationTest() {
  console.log("[REGISTRATION] Starting registration tests");
  // Valid user:
  axios
    .post("http://localhost/register", validUserData, config)
    .then((response) => {
      if (response.data.message == "User registered successfully") {
        console.log("[REGISTRATION] Test 1 (Valid User Registration): PASSED");
      } else {
        console.log(
          "[REGISTRATION] Test 1 (Valid User Registration): FAILED (GOT " +
            response.data.message +
            ' EXPECTED "User registered successfully" '
        );
      }
    })
    .catch((error) => {
      console.log(
        "[REGISTRATION] Test 1 (Valid User Registration): FAILED (GOT " +
          response.data.message ||
          "ERROR " + ' EXPECTED "User registered successfully" '
      );
    });
}

function loginTest() {}

function authenicatedRequestTest() {}

function emailVerificationTest() {}

function passwordResetTest() {}

setInterval(function () {
  currentUserData = new URLSearchParams({
    username: generaterandom(),
    email: generaterandom() + "@" + generaterandom() + ".com",
    password: generaterandom(),
    "h-captcha-response": "10000000-aaaa-bbbb-cccc-000000000001",
  });

  startdate = Date();

  axios
    .post("http://localhost/register", currentUserData, config)
    .then(function (response) {
      successes++;
      console.log(
        "USER " +
          currentUser +
          " : REGISTERED; " +
          successes +
          " SUCCESSFUL REGISTRATIONS, " +
          failures +
          " FAILURES. "
      );
      currentUser++;
    })
    .catch(function (error) {
      failures++;
      console.log(
        "!USER " +
          currentUser +
          " : ERROR!; " +
          successes +
          " SUCCESSFUL REGISTRATIONS, " +
          failures +
          " FAILURES. ERR: " +
          error.response.data.message
      );
      currentUser++;
    });
}, 2);

// for (let currentUser = 0; currentUser < totalUsers; currentUser++) {
//   currentUserData = new URLSearchParams(users[currentUser]);

//   axios
//     .post("http://localhost/register", currentUserData, config)
//     .then(function (response) {
//       console.log("USER " + currentUser + " :" + response);
//     })
//     .catch(function (error) {
//       console.log("ERR");
//     });
// }
