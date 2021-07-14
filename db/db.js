const mongoose = require("mongoose");
const config = require("../config.js");

const emailVerificationTokenModel = require("./models/emailVerificationToken.model.js");
const passwordResetTokenModel = require("./models/passwordResetToken.model.js");
const newIPTokenModel = require("./models/newIPToken.model.js");
const refreshTokenModel = require("./models/refreshToken.model.js");
const userModel = require("./models/user.model.js");

const mongodbserver = config.db.connectionstring;
mongoose.connect(mongodbserver, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const db = mongoose.connection;

mongoose.set("useFindAndModify", false); // https://stackoverflow.com/questions/52572852/deprecationwarning-collection-findandmodify-is-deprecated-use-findoneandupdate

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
const newIPToken = mongoose.model(
  "newIPToken",
  newIPTokenModel.newIPTokenSchema
);
const refreshToken = mongoose.model(
  "refreshToken",
  refreshTokenModel.refreshTokenSchema
);

module.exports = {
  user,
  emailVerificationToken,
  passwordResetToken,
  newIPToken,
  refreshToken,
};
