const { DataTypes } = require("sequelize");
const sequelize = require("../db_connection").sequelize;

const account_connections = sequelize.define("account_connections", {
  id: { type: DataTypes.DECIMAL, unique: true, primaryKey: true },
  provider: { type: DataTypes.STRING },
  data: { type: DataTypes.JSONB },
});

module.exports = account_connections;
