const axios = require("axios");

function verify(secret, recaptcha_responsee) {
  return new Promise(function (resolve, reject) {
    axios
      .post(
        "https://www.google.com/recaptcha/api/siteverify",
        "secret=" + secret + "&response=" + recaptcha_responsee
      )
      .then((res) => {
        if (res.status === 200) {
          return resolve(res.data);
        }
      })
      .catch(() => {
        return reject("CAPTCHA Error");
      });
  });
}

module.exports = { verify };
