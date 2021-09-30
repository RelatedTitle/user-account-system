const email_verification_token = require("./models/email_verification_token.model.js");
const password_reset_token = require("./models/password_reset_token.model.js");
const new_IP_token = require("./models/new_IP_token.model.js");
const refresh_token = require("./models/refresh_token.model.js");
const user = require("./models/user.model.js");
const account_connection = require("./models/account_connection.model.js");
const userip = require("./models/userip.model.js");

account_connection.belongsTo(user);
userip.belongsTo(user);
email_verification_token.belongsTo(user);
password_reset_token.belongsTo(user);
new_IP_token.belongsTo(user);
refresh_token.belongsTo(user);

module.exports = {
  user,
  account_connection,
  userip,
  email_verification_token,
  password_reset_token,
  new_IP_token,
  refresh_token,
};
