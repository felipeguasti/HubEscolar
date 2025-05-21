require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || "u612973268_broadcast",
    password: process.env.DB_PASSWORD || "E1=iTrLXsvk",
    database: process.env.DB_NAME || "u612973268_broadcast",
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql"
  },
  test: {
    username: process.env.DB_USER || "u612973268_broadcast",
    password: process.env.DB_PASSWORD || "E1=iTrLXsvk",
    database: process.env.DB_NAME || "u612973268_broadcast_test",
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql"
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "mysql"
  }
};