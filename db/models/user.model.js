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
      sparse: true,
    },
    realusername: {
      type: String,
      unique: true,
      sparse: true,
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
      sparse: true,
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
        sparse: true,
      },
      date: Date,
      emailtype: Number,
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
  userIPs: 
  [{
    ip: String,
    dateAdded: Date,
    authorized: Boolean,
    dateAuthorized: Date,
  }],
  password: String,
  creationDate: Date,
});

module.exports = { userSchema };
