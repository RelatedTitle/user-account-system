const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

module.exports = { refreshTokenSchema };
