require('dotenv').config();

// Development configuration (default)
const development = {
  username: "u612973268_broadcast",
  password: "E1=iTrLXsvk",
  database: "u612973268_broadcast",
  host: "localhost",
  dialect: "mysql",
  logging: false
};

// Test configuration
const test = {
  username: process.env.MYSQL_USER || "u612973268_broadcast",
  password: process.env.MYSQL_PASSWORD || "E1=iTrLXsvk",
  database: process.env.MYSQL_DATABASE || "u612973268_broadcast_test",
  host: process.env.MYSQL_HOST || "localhost",
  dialect: "mysql",
  logging: false
};

// Production configuration
const production = {
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  host: process.env.MYSQL_HOST,
  dialect: "mysql",
  logging: false
};

// Export configurations for Sequelize CLI
module.exports = {
  development,
  test,
  production
};

// Export Sequelize instance for models
const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  development.database,
  development.username,
  development.password,
  {
    host: development.host,
    dialect: development.dialect,
    logging: development.logging
  }
);

// Test connection
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com MySQL estabelecida com sucesso!');
  })
  .catch(err => {
    console.error('Erro ao conectar ao MySQL:', err);
  });

module.exports.sequelize = sequelize;