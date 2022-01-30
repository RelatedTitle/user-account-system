const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");

function issue_access_jwt(userid, email, refresh_token) {
  body = {
    _id: userid,
    email: email,
  };
  access_token = jwt.sign(
    { user: body, type: "access", refresh_token: refresh_token },
    config.user.jwt_auth_secret
  );

  return access_token;
}

function issue_refresh_jwt(userid, email) {
  return new Promise(function (resolve, reject) {
    body = {
      _id: userid,
      email: email,
    };

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
        access_token = issue_access_jwt(userid, email, refresh_token.token);
        resolve({
          access_token: access_token,
          refresh_token: refresh_token.token,
        });
      })
      .catch((error) => {
        return reject(
          new Error("Failed to create refresh token.", { cause: error })
        );
      });
  });
}

// Expires all of the user's active refresh tokens. (Except the exclude tokens, if specified.)
function expire_user_tokens(userid, reason, exclude_tokens) {
  return new Promise(function (resolve, reject) {
    db.refresh_token
      .update(
        { expired: true, expiry_date: new Date(), expiry_reason: reason },
        {
          where: {
            userUserid: userid,
            expired: false,
            token: { [db.Op.notIn]: exclude_tokens || [] },
          },
        }
      )
      .then(() => {
        return resolve();
      })
      .catch((error) => {
        return reject(
          new Error("Unable to expire refresh token.", { cause: error })
        );
      });
  });
}

// Expires a refresh token.
function expire_refresh_tokens(refresh_tokens, reason) {
  return new Promise(function (resolve, reject) {
    db.refresh_token
      .update(
        { expired: true, expiry_date: new Date(), expiry_reason: reason },
        { where: { token: refresh_tokens, expired: false } }
      )
      .then(() => {
        return resolve();
      })
      .catch((error) => {
        return reject(
          new Error("Unable to expire refresh token.", { cause: error })
        );
      });
  });
}

module.exports = {
  issue_access_jwt,
  issue_refresh_jwt,
  expire_user_tokens,
  expire_refresh_tokens,
};
