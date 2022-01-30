const { Sequelize } = require("sequelize");
const config = require("../config.js");

const sequelize = new Sequelize(config.db.connection_string, {
  logging: false,
});

module.exports = { sequelize };
