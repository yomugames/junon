module.exports = {
  "development": {
    "username": process.env['JUNON_DB_USER'] || "vege",
    "password": process.env['JUNON_DB_PASS'] || null,
    "database": "junon_development",
    "host": "127.0.0.1",
    "dialect": "mysql"
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
