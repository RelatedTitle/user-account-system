const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db_connection");

const new_IP_token = sequelize.define("new_IP_token", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  ip: { type: DataTypes.STRING },
  token: { type: DataTypes.STRING },
  expired: { type: DataTypes.BOOLEAN },
});

module.exports = new_IP_token;
