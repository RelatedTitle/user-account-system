const mongoose = require("mongoose");

const email_verification_token_schema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

module.exports = { email_verification_token_schema };
