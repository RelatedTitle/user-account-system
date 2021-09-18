const mongoose = require("mongoose");
const config = require("../config.js");

const email_verification_token_model = require("./models/email_verification_token.model.js");
const password_reset_token_model = require("./models/password_reset_token.model.js");
const new_IP_token_model = require("./models/new_IP_token.model.js");
const refresh_token_model = require("./models/refresh_token.model.js");
const user_model = require("./models/user.model.js");

const mongodbserver = config.db.connection_string;
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

const user = mongoose.model("user", user_model.user_schema);
const email_verification_token = mongoose.model(
  "email_verification_token",
  email_verification_token_model.email_verification_token_schema
);
const password_reset_token = mongoose.model(
  "password_reset_token",
  password_reset_token_model.password_reset_token_schema
);
const new_IP_token = mongoose.model(
  "new_IP_token",
  new_IP_token_model.new_IP_token_schema
);
const refresh_token = mongoose.model(
  "refresh_token",
  refresh_token_model.refresh_token_schema
);

module.exports = {
  user,
  email_verification_token,
  password_reset_token,
  new_IP_token,
  refresh_token,
};
