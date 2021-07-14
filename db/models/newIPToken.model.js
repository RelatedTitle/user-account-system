const mongoose = require("mongoose");

const newIPTokenSchema = new mongoose.Schema({
  userid: Number,
  ip: String,
  token: String,
  expired: Boolean,
});

module.exports = { newIPTokenSchema };
