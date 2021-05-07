const mongoose = require("mongoose");
const config = require("../config.js");

const emailVerificationTokenModel = require("./emailVerificationToken.model.js");
const passwordResetTokenModel = require("./passwordResetToken.model.js");
const refreshTokenModel = require("./refreshToken.model.js");
const userModel = require("./user.model.js");

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

const user = mongoose.model("user", userModel.userSchema);
const emailVerificationToken = mongoose.model(
  "emailVerificationToken",
  emailVerificationTokenModel.emailVerificationTokenSchema
);
const passwordResetToken = mongoose.model(
  "passwordResetToken",
  passwordResetTokenModel.passwordResetTokenSchema
);
const refreshToken = mongoose.model(
  "refreshToken",
  refreshTokenModel.refreshTokenSchema
);

module.exports = {
  user,
  emailVerificationToken,
  passwordResetToken,
  refreshToken,
};
