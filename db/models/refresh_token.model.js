const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db_connection");

const refresh_token = sequelize.define("refresh_token", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  email: { type: DataTypes.STRING },
  token: { type: DataTypes.STRING },
  expired: { type: DataTypes.BOOLEAN },
});

module.exports = refresh_token;
