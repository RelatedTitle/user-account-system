const mongoose = require("mongoose");

const new_IP_token_schema = new mongoose.Schema({
  userid: Number,
  ip: String,
  token: String,
  expired: Boolean,
});

module.exports = { new_IP_token_schema };
