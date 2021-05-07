const mongoose = require("mongoose");

const emailVerificationTokenSchema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

module.exports = { emailVerificationTokenSchema };
