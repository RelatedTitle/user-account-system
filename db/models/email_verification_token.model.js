const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db_connection");

const email_verification_token = sequelize.define("email_verification_token", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  email: { type: DataTypes.STRING },
  token: { type: DataTypes.STRING },
  expired: { type: DataTypes.BOOLEAN },
});

module.exports = email_verification_token;
