const mongoose = require("mongoose");

const refresh_token_schema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

module.exports = { refresh_token_schema };
