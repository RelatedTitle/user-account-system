const axios = require("axios");

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

const totalUsers = 5;

const users = [];

for (let currentUserGen = 0; currentUserGen < totalUsers; currentUserGen++) {
  users.push({
    username: generaterandom(),
    email: generaterandom() + "@" + generaterandom() + ".com",
    password: generaterandom(),
  });
}

var currentUser = 1;
var successes = 0;
var failures = 0;
var startdate = 0;

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
