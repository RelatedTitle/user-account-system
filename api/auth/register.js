const router = require("express").Router();

const register = require("../../auth/register.js");
const config = require("../../config.js");
const issue_jwt = require("../../auth/issue_jwt.js");

// MIDDLEWARE:
const check_captcha = require("../middlewares/captcha.js");

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
      message: "Invalid email",
    });
  }
  if (!config.user.username_regex.test(req.body.username)) {
    return res.status(400).json({
      error: true,
      message: "Invalid username",
    });
  }
  if (!config.user.password_regex.test(req.body.password)) {
    return res.status(400).json({
      error: true,
      message: "Invalid password",
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
      issue_jwt
        .issue_refresh_jwt(registered_user.userid, registered_user.email.email)
        .then((tokens) => {
          res.status(201).json({
            error: false,
            message: "User registered successfully",
            user: {
              userid: registered_user.userid,
              username: registered_user.username.display_username,
              email: registered_user.email.email,
            },
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
        });
    })
    .catch((error) => {
      switch (error) {
        case "Username already exists":
          res.status(409).json({
            error: true,
            message: "Username already exists",
          });
          break;
        case "Email already exists":
          res.status(409).json({
            error: true,
            message: "Email already exists",
          });
          break;
        case "Unknown error":
          res.status(500).json({
            error: true,
            message: "Unknown error",
          });
          break;
        default:
          break;
      }
    });
});

module.exports = router;
