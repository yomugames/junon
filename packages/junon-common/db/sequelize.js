global.env = process.env.NODE_ENV || 'development'

const Sequelize = require('sequelize');
const config = require('./config')[env]

const options = {
  dialect: config.dialect,
  storage: config.storage,
  logging: config.logging,
  pool: {
    max: 20,
    min: 1,
    idle: 20000,
    acquire: 1000000
  }
}

// Option 1: Passing parameters separately
const sequelize = new Sequelize(config.database, config.username, config.password, options);

// @note https://github.com/sequelize/sequelize/issues/8133#issuecomment-359993057

module.exports  = sequelize