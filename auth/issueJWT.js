const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");

function issueAccessJWT(userid, email) {
  return new Promise(function (resolve, reject) {
    body = {
      _id: userid,
      email: email,
    };
    accessToken = jwt.sign(
      { user: body, type: "access" },
      config.user.jwtauthsecret
    );

    resolve({ accessToken: accessToken });
  });
}

function issueRefreshJWT(userid, email) {
  return new Promise(function (resolve, reject) {
    body = {
      _id: userid,
      email: email,
    };
    accessToken = jwt.sign(
      { user: body, type: "access" },
      config.user.jwtauthsecret
    );

    refreshToken = new db.refreshToken({
      userid: userid,
      email: email,
      token: jwt.sign(
        { user: body, type: "refresh" },
        config.user.jwtauthsecret
      ),
      expired: false,
    });
    refreshToken.save().then((refreshToken) => {
      resolve({ accessToken: accessToken, refreshToken: refreshToken.token });
    });
  });
}

module.exports = { issueAccessJWT, issueRefreshJWT };
