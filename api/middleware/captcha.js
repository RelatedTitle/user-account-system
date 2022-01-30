const config = require("../../config.js");
const hcaptcha = require("hcaptcha");
const recaptcha = require("../../util/reCAPTCHA.js");

async function check_captcha(req, res, next) {
  let captcha_response =
    req.body["h-captcha-response"] || req.body["g-captcha-response"];
  let captcha_type;

  if (!config.hcaptcha.enabled && !config.recaptcha.enabled) {
    // If captcha is disabled, continue.
    return next();
  }

  if (
    captcha_response === config.captcha_secret_bypass_key &&
    config.captcha_secret_bypass_keyenabled == true
  ) {
    // If using the bypass key and it is enabled, skip the captcha check.
    return next();
  }

  if (
    req.body["h-captcha-response"] != null &&
    req.body["h-captcha-response"] != ""
  ) {
    captcha_type = "hcaptcha";
  } else if (
    req.body["g-captcha-response"] != null &&
    req.body["g-captcha-response"] != ""
  ) {
    captcha_type = "recaptcha";
  } else {
    return res.status(400).json({
      error: true,
      message: "No CAPTCHA response provided.",
    });
  }

  if (captcha_type === "hcaptcha") {
    if (!config.hcaptcha.enabled) {
      return res.status(400).json({
        error: true,
        message: "hCaptcha is not enabled.",
      });
    }
    hcaptcha
      .verify(config.hcaptcha.secret, captcha_response)
      .then((data) => {
        if (data.success) {
          // If the captcha is valid, continue.
          return next();
        }
        // Captcha is invalid.
        return res.status(409).json({
          error: true,
          message: "CAPTCHA Incorrect.",
        });
      })
      .catch((error) => {
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      });
  }

  if (captcha_type === "recaptcha") {
    if (!config.recaptcha.enabled) {
      return res.status(400).json({
        error: true,
        message: "reCAPTCHA is not enabled.",
      });
    }
    recaptcha
      .verify(config.recaptcha.secret, captcha_response)
      .then((data) => {
        if (data.success) {
          // If the captcha is valid, continue.
          return next();
        }
        // Captcha is invalid.
        return res.status(409).json({
          error: true,
          message: "CAPTCHA Incorrect.",
        });
      })
      .catch((error) => {
        return res.status(500).json({
          error: true,
          message: "CAPTCHA Error.",
        });
      });
  }
}

module.exports = check_captcha;
