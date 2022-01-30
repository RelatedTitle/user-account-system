const router = require("express").Router();

const register = require("../../auth/register.js");
const config = require("../../config.js");
const auth_token = require("../../auth/tokens.js");

// MIDDLEWARE:
const check_captcha = require("../middleware/captcha.js");

router.post("/auth/register", check_captcha, async (req, res) => {
  if (!req.body.email || !req.body.username || !req.body.password) {
    return res.status(400).json({
      error: true,
      message: "Your request is garbage.",
    });
  }

  if (!config.user.email_regex.test(req.body.email.toLowerCase())) {
    return res.status(400).json({
      error: true,
      message: "Invalid email address.",
    });
  }
  if (!config.user.username_regex.test(req.body.username)) {
    return res.status(400).json({
      error: true,
      message: "Invalid username.",
    });
  }
  if (!config.user.password_regex.test(req.body.password)) {
    return res.status(400).json({
      error: true,
      message: "Invalid password.",
    });
  }

  await register
    .register_user(
      req.body.email.toLowerCase(),
      req.body.username,
      req.body.password,
      null,
      req.ip // No need to worry about x-forwarded-for since express will use that automatically when behind a proxy. (As long as config.usingproxy is set to true)
    )
    .then((registered_user) => {
      auth_token
        .issue_refresh_jwt(registered_user.userid, registered_user.email)
        .then((tokens) => {
          res.status(201).json({
            error: false,
            message: "User registered successfully.",
            user: {
              userid: registered_user.userid,
              username: registered_user.username,
              email: registered_user.email,
            },
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
        })
        .catch((error) => {
          // Failed to issue refresh token.
          res.status(500).json({ error: true, message: error.message });
        });
    })
    .catch((error) => {
      switch (error.message) {
        case "Username already in use.":
          return res.status(409).json({
            error: true,
            message: error.message,
          });
          break;
<<<<<<< HEAD
        case "Email already in use.":
=======
        case "Email address already in use.":
>>>>>>> efdc5c6e5e68a8f6d1ef80b4fb62efd8e81914e4
          return res.status(409).json({
            error: true,
            message: error.message,
          });
          break;
        default:
          return res.status(500).json({
            error: true,
            message: error.message,
          });
          break;
      }
    });
});

module.exports = router;
