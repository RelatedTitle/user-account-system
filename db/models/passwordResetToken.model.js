const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

module.exports = { passwordResetTokenSchema };
