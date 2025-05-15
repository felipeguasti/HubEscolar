require('dotenv').config();
const path = require('path');


module.exports = {
  development: {
    username: "u612973268_broadcast",
    password: "E1=iTrLXsvk",
    database: "u612973268_broadcast",
    host: "127.0.0.1",
    dialect: "mysql",
    migrationStoragePath: path.join(__dirname, '../migrations'),
  },
  test: {
    username: "u612973268_broadcast",
    password: "E1=iTrLXsvk",
    database: "u612973268_broadcast",
    host: "127.0.0.1",
    dialect: "mysql",
    migrationStoragePath: path.join(__dirname, '../migrations'),
  },
  production: {
    username: "u612973268_broadcast",
    password: "E1=iTrLXsvk",
    database: "database_production",
    host: "127.0.0.1",
    dialect: "mysql",
    migrationStoragePath: path.join(__dirname, '../migrations'),
  },
};