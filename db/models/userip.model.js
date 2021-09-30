const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db_connection");

const userip = sequelize.define("userip", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  ip: { type: DataTypes.STRING },
  date_added: { type: DataTypes.DATE },
  authorized: { type: DataTypes.BOOLEAN },
  date_authorized: { type: DataTypes.DATE },
});

module.exports = userip;
