const mongoose = require("mongoose");
const config = require("./config.js");

const { customAlphabet } = require("nanoid");
const generateuserid = customAlphabet(
  config.user.idalphabet,
  config.user.idlength
);

const mongodbserver = config.db.connectionstring;
mongoose.connect(mongodbserver, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});
const db = mongoose.connection;

db.on(
  "error",
  console.error.bind(
    console,
    "[RelatedTechNetwork] ERR: Database Connection Error: "
  )
);
db.once("open", function () {
  console.log("[RelatedTechNetwork] Database Connection was Successful");
});

const refreshTokenSchema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

const emailVerificationTokenSchema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

const passwordResetTokenSchema = new mongoose.Schema({
  userid: Number,
  email: String,
  token: String,
  expired: Boolean,
});

const userschema = new mongoose.Schema({
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

const user = mongoose.model("user", userschema);
const emailVerificationToken = mongoose.model(
  "emailVerificationToken",
  emailVerificationTokenSchema
);
const passwordResetToken = mongoose.model(
  "passwordResetToken",
  passwordResetTokenSchema
);
const refreshToken = mongoose.model("refreshToken", refreshTokenSchema);

async function createuser(username, realemail, password, userid) {
  if (!userid) {
    userid = generateuserid();
  }
  let realusername = username.toLowerCase();
  let currentDate = Date();
  let newuser = new user({
    userid: userid,
    username: {
      displayusername: username,
      realusername: realusername,
    },
    email: {
      email: realemail,
      verified: false,
    },
    password: password,
    creationDate: currentDate,
  });
  newuser.emailhistory.push({
    email: realemail,
    date: currentDate,
    verified: false,
  });
  return await newuser.save();
}

async function getuser(useruserid, userusername, useremail) {
  if (useruserid) {
    return await user.findOne({ userid: useruserid });
  } else if (useremail) {
    return await user.findOne({ "email.email": useremail });
  } else if (userusername) {
    return await user.findOne({ "username.realusername": userusername });
  } else {
    return null;
  }
}

async function updateuser(query, update) {
  return await user.findOneAndUpdate(query, update);
}

module.exports = {
  createuser,
  getuser,
  updateuser,
  user,
  emailVerificationToken,
  passwordResetToken,
  refreshToken,
};
