module.exports = {
  // Jest sets NODE_ENV=test by default when it isn't already set, and
  // db/sequelize.js does `config[env]` unconditionally - without a "test"
  // entry here, any test that touches junon-common/db (transitively, e.g.
  // via Team -> junon-common/db/sector) crashes immediately trying to read
  // `.database` off `undefined`, before ever reaching a real connection.
  //
  // This uses sqlite (in-memory) instead of mysql so tests never depend on a
  // live MySQL server being reachable - a test that hits a real db query used
  // to open a real TCP connection to 127.0.0.1:3306, and when nothing was
  // listening there, mysql2 would blow up asynchronously *after* the test
  // file finished and Jest tore down its environment, crashing the whole
  // process instead of just failing a test.
  "test": {
    "username": null,
    "password": null,
    "database": null,
    "storage": ":memory:",
    "dialect": "sqlite",
    "logging": false
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
