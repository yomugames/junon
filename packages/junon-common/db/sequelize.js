global.env = process.env.NODE_ENV || 'development'

const Sequelize = require('sequelize');
const config = require('./config')[env]

// Option 1: Passing parameters separately
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: 'mysql',
  logging: config.logging,
  define: {
    charset: 'utf8mb4',
    dialectOptions: {
      collate: 'utf8mb4_general_ci'
    }
  },
  pool: {
    max: 20,
    min: 1,
    idle: 20000,
    acquire: 1000000
  }
});

// @note https://github.com/sequelize/sequelize/issues/8133#issuecomment-359993057

module.exports  = sequelize