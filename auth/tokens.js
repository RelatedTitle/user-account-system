const config = require("../config.js");
const jwt = require("jsonwebtoken");
const db = require("../db/db.js");

function issue_access_jwt(userid, email, refresh_token) {
  let body = {
    _id: userid,
    email: email,
  };
  let access_token = jwt.sign(
    { user: body, type: "access", refresh_token: refresh_token },
    config.user.jwt_auth_secret
  );

  return access_token;
}

async function issue_refresh_jwt(userid, email) {
  let body = {
    _id: userid,
    email: email,
  };
  try {
    var refresh_token = await db.refresh_token.create({
      userUserid: userid,
      email: email,
      token: jwt.sign(
        { user: body, type: "refresh" },
        config.user.jwt_auth_secret
      ),
      expired: false,
    });
  } catch (error) {
    throw new Error("Failed to create refresh token.", { cause: error });
  }
  let access_token = issue_access_jwt(userid, email, refresh_token.token);
  return {
    access_token: access_token,
    refresh_token: refresh_token.token,
  };
}

// Expires all of the user's active refresh tokens. (Except the exclude tokens, if specified.)
async function expire_user_tokens(userid, reason, exclude_tokens) {
  try {
    // Update all of the user's refresh tokens that aren't expired and don't match the exclude tokens to expired.
    await db.refresh_token.update(
      { expired: true, expiry_date: new Date(), expiry_reason: reason },
      {
        where: {
          userUserid: userid,
          expired: false,
          token: { [db.Op.notIn]: exclude_tokens || [] },
        },
      }
    );
  } catch (error) {
    throw new Error("Unable to expire refresh token.", { cause: error });
  }
  return;
}

// Expire specific refresh tokens.
async function expire_refresh_tokens(refresh_tokens, reason) {
  try {
    // Update the refresh tokens to expired with the given reason.
    await db.refresh_token.update(
      { expired: true, expiry_date: new Date(), expiry_reason: reason },
      { where: { token: refresh_tokens, expired: false } }
    );
  } catch (error) {
    throw new Error("Unable to expire refresh token.", { cause: error });
  }
  return;
}

module.exports = {
  issue_access_jwt,
  issue_refresh_jwt,
  expire_user_tokens,
  expire_refresh_tokens,
};
