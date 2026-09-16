module.exports = {
  // Jest sets NODE_ENV=test by default when it isn't already set, and
  // db/sequelize.js does `config[env]` unconditionally - without a "test"
  // entry here, any test that touches junon-common/db (transitively, e.g.
  // via Team -> junon-common/db/sector) crashes immediately trying to read
  // `.database` off `undefined`, before ever reaching a real connection.
  "test": {
    "username": process.env['JUNON_DB_USER'] || "root",
    "password": process.env['JUNON_DB_PASS'] || null,
    "database": process.env['JUNON_DB_NAME'] || "junon_test",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "development": {
    "username": process.env['JUNON_DB_USER'] || "root",
    "password": process.env['JUNON_DB_PASS'] || null,
    "database": "junon_development",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "staging": {
    "username": process.env['JUNON_DB_USER'],
    "password": process.env['JUNON_DB_PASS'],
    "database": "junon_staging",
    "host": process.env['JUNON_DB_HOST'],
    "dialect": "mysql",
    "logging": false
  },
  "production": {
    "username": process.env['JUNON_DB_USER'],
    "password": process.env['JUNON_DB_PASS'],
    "database": "junon_production",
    "host": process.env['JUNON_DB_HOST'],
    "dialect": "mysql",
    "logging": false
  }
}
