const axios = require("axios");

function verify(secret, recaptchaResponse) {
  return new Promise(function (resolve, reject) {
    axios
      .post(
        "https://www.google.com/recaptcha/api/siteverify",
        "secret=" + secret + "&response=" + recaptchaResponse
      )
      .then((res) => {
        if (res.status === 200) {
          return resolve(res.data);
        }
      })
      .catch((error) => {
        return reject("CAPTCHA Error");
      });
  });
}

module.exports = { verify };
