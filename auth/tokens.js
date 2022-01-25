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

    db.refresh_token
      .create({
        userUserid: userid,
        email: email,
        token: jwt.sign(
          { user: body, type: "refresh" },
          config.user.jwt_auth_secret
        ),
        expired: false,
      })
      .then((refresh_token) => {
        resolve({
          access_token: access_token,
          refresh_token: refresh_token.token,
        });
      });
  });
}

// Expires all of the user's active refresh tokens.
function expire_user_tokens(userid, reason) {
  return new Promise(function (resolve, reject) {
    db.refresh_token
      .update(
        { expired: true, expiry_date: new Date(), expiry_reason: reason },
        { where: { userUserid: userid, expired: false } }
      )
      .then(() => {
        return resolve();
      })
      .catch((error) => {
        return reject("Unable to expire refresh token.");
      });
  });
}

// Expires a refresh token.
function expire_refresh_token(refresh_token, reason) {
  return new Promise(function (resolve, reject) {
    db.refresh_token
      .update(
        { expired: true, expiry_date: new Date(), expiry_reason: reason },
        { where: { token: refresh_token } }
      )
      .then(() => {
        return resolve();
      })
      .catch((error) => {
        return reject("Unable to expire refresh token.");
      });
  });
}

module.exports = {
  issue_access_jwt,
  issue_refresh_jwt,
  expire_user_tokens,
  expire_refresh_token,
};
