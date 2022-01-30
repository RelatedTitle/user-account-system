const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db_connection").sequelize;

const password_reset_token = sequelize.define("password_reset_token", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  email: { type: DataTypes.STRING },
  token: { type: DataTypes.STRING, unique: true },
  expired: { type: DataTypes.BOOLEAN },
});

module.exports = password_reset_token;
