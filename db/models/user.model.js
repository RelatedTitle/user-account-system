const mongoose = require("mongoose");

const user_schema = new mongoose.Schema({
  userid: {
    type: Number,
    unique: true,
    sparse: true,
  },
  username: {
    display_username: {
      type: String,
      unique: true,
      sparse: true,
    },
    real_username: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  usernamehistory: [
    {
      display_username: String,
      real_username: String,
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
      sparse: true,
    },
    email_type: Number,
    provider: String,
    verified: Boolean,
  },
  emailhistory: [
    {
      email: {
        type: String,
        unique: true,
        sparse: true,
      },
      date: Date,
      email_type: Number,
      provider: String,
      verified: Boolean,
    },
  ],
  account_connections: [
    {
      provider: String,
      data: Object,
    },
  ],
  oauth: {
    googleoauthid: {
      type: String,
      unique: true,
      sparse: true,
    },
    githuboauthid: {
      type: String,
      unique: true,
      sparse: true,
    },
    discordoauthid: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookoauthid: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  "2FA": {
    secret: String,
    active: Boolean,
  },
  userIPs: [
    {
      ip: String,
      date_added: Date,
      authorized: Boolean,
      date_authorized: Date,
    },
  ],
  password: String,
  creation_date: Date,
});

module.exports = { user_schema };
