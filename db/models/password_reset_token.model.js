const mongoose = require("mongoose");

const password_reset_token_schema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

module.exports = { password_reset_token_schema };
