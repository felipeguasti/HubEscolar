require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql', // Define um padrão caso não esteja no .env
    logging: false, // Opcional: desativa logs do Sequelize no desenvolvimento
  },
  test: {
    username: process.env.DB_USER_TEST || process.env.DB_USER, // Use variáveis específicas para teste se existirem
    password: process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || process.env.DB_NAME,
    host: process.env.DB_HOST_TEST || process.env.DB_HOST,
    port: process.env.DB_PORT_TEST || process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER_PROD || process.env.DB_USER, // Use variáveis específicas para produção se existirem
    password: process.env.DB_PASSWORD_PROD || process.env.DB_PASSWORD,
    database: process.env.DB_NAME_PROD || process.env.DB_NAME,
    host: process.env.DB_HOST_PROD || process.env.DB_HOST,
    port: process.env.DB_PORT_PROD || process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true', // Habilita SSL se a variável estiver definida como 'true'
    },
  },
};