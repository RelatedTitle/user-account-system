const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userid: {
    type: Number,
    unique: true,
    sparse: true,
  },
  username: {
    displayusername: {
      type: String,
      unique: true,
    },
    realusername: {
      type: String,
      unique: true,
    },
  },
  usernamehistory: [
    {
      displayusername: String,
      realusername: String,
      date: Date,
    },
  ],
  trustscore: Number,
  trustactions: [
    {
      action: String,
      points: Number,
      date: Date,
      data: Object,
    },
  ],
  email: {
    email: {
      type: String,
      unique: true,
    },
    emailtype: Number,
    provider: String,
    verified: Boolean,
  },
  emailhistory: [
    {
      email: {
        type: String,
        unique: true,
      },
      date: Date,
      emailtype: Number,
      provider: String,
      verified: Boolean,
    },
  ],
  password: String,
  creationDate: Date,
});

module.exports = { userSchema };
