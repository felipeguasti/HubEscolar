const db = require('./db');

module.exports = {
  development: {
    username: db.config.username,
    password: db.config.password,
    database: db.config.database,
    host: db.config.host,
    dialect: db.config.dialect
  },
  test: {
    username: db.config.username,
    password: db.config.password,
    database: db.config.database,
    host: db.config.host,
    dialect: db.config.dialect
  },
  production: {
    username: db.config.username,
    password: db.config.password,
    database: db.config.database,
    host: db.config.host,
    dialect: db.config.dialect
  }
};