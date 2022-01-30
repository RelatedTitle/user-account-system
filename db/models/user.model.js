const { DataTypes } = require("sequelize");
const sequelize = require("../db_connection").sequelize;

const user = sequelize.define("user", {
  userid: {
    type: DataTypes.BIGINT,
    unique: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
  },
  trustscore: { type: DataTypes.INTEGER },
  email: {
    type: DataTypes.STRING,
    unique: true,
  },
  email_type: { type: DataTypes.INTEGER },
  email_provider: { type: DataTypes.STRING },
  email_verified: { type: DataTypes.BOOLEAN },
  MFA_secret: { type: DataTypes.STRING },
  MFA_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  password: { type: DataTypes.STRING },
  creation_date: { type: DataTypes.DATE },
  avatar_url: { type: DataTypes.STRING },
});

module.exports = user;
