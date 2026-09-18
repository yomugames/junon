global.env = process.env.NODE_ENV || 'development'

const Sequelize = require('sequelize');
const config = require('./config')[env]

const options = {
  host: config.host,
  dialect: config.dialect,
  storage: config.storage, // only used by the sqlite dialect (see config.js's "test" entry)
  logging: config.logging,
  pool: {
    max: 20,
    min: 1,
    idle: 20000,
    acquire: 1000000
  }
}

// charset/collate are mysql-specific table options; sqlite (used in tests, see
// config.js) has no equivalent and errors on unknown dialectOptions.
if (config.dialect === 'mysql') {
  options.define = {
    charset: 'utf8mb4',
    dialectOptions: {
      collate: 'utf8mb4_general_ci'
    }
  }
}

// Option 1: Passing parameters separately
const sequelize = new Sequelize(config.database, config.username, config.password, options);

// @note https://github.com/sequelize/sequelize/issues/8133#issuecomment-359993057

module.exports  = sequelize