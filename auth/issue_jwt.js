const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");

function issue_access_jwt(userid, email) {
  return new Promise(function (resolve, reject) {
    body = {
      _id: userid,
      email: email,
    };
    access_token = jwt.sign(
      { user: body, type: "access" },
      config.user.jwt_auth_secret
    );

    resolve({ access_token: access_token });
  });
}

function issue_refresh_jwt(userid, email) {
  return new Promise(function (resolve, reject) {
    body = {
      _id: userid,
      email: email,
    };
    access_token = jwt.sign(
      { user: body, type: "access" },
      config.user.jwt_auth_secret
    );

    refresh_token = new db.refresh_token({
      userid: userid,
      email: email,
      token: jwt.sign(
        { user: body, type: "refresh" },
        config.user.jwt_auth_secret
      ),
      expired: false,
    });
    refresh_token.save().then((refresh_token) => {
      resolve({
        access_token: access_token,
        refresh_token: refresh_token.token,
      });
    });
  });
}

module.exports = { issue_access_jwt, issue_refresh_jwt };
