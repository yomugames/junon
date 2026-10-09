module.exports = {
  // Jest sets NODE_ENV=test by default when it isn't already set, and
  // db/sequelize.js does `config[env]` unconditionally - without a "test"
  // entry here, any test that touches junon-common/db (transitively, e.g.
  // via Team -> junon-common/db/sector) crashes immediately trying to read
  // `.database` off `undefined`, before ever reaching a real connection.
  //
  // Tests use an in-memory database.
  "test": {
    "username": null,
    "password": null,
    "database": null,
    "storage": ":memory:",
    "dialect": "sqlite",
    "logging": false
  },
  // The game's database is a sqlite file next to the world saves, shared by
  // every world in that directory (the hosted game used MySQL with the same
  // tables and models).
  "standalone": {
    "username": null,
    "password": null,
    "database": null,
    "storage": process.env['JUNON_SAVES_DIR'] ? require('path').join(process.env['JUNON_SAVES_DIR'], 'junon.sqlite') : null,
    "dialect": "sqlite",
    "logging": false
  },
  // development uses the same sqlite file layout as standalone
  "development": {
    "username": null,
    "password": null,
    "database": null,
    "storage": process.env['JUNON_SAVES_DIR'] ? require('path').join(process.env['JUNON_SAVES_DIR'], 'junon.sqlite') : null,
    "dialect": "sqlite",
    "logging": false
  }
}
