const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db_connection").sequelize;

const new_IP_token = sequelize.define("new_IP_token", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  ip: { type: DataTypes.STRING },
  token: { type: DataTypes.STRING, unique: true },
  expired: { type: DataTypes.BOOLEAN },
});

module.exports = new_IP_token;
