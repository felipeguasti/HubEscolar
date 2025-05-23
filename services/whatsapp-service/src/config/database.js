require('dotenv').config();
const { Sequelize } = require('sequelize');

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

// Selecionar a configuração baseada no ambiente
const env = process.env.NODE_ENV || 'development';
const config = { development, test, production }[env];

// Criar e exportar a instância do Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: config.logging
  }
);

// Testar a conexão
sequelize.authenticate()
  .then(() => console.log('Conexão com o banco de dados estabelecida com sucesso.'))
  .catch(err => console.error('Não foi possível conectar ao banco de dados:', err));

// Exportar a instância do Sequelize diretamente
module.exports = sequelize;