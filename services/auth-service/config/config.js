import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/../.env` });

export default {
  development: {
    username: process.env.DB_USER || "u612973268_broadcast",
    password: process.env.DB_PASSWORD || "E1=iTrLXsvk",
    database: process.env.DB_NAME || "u612973268_broadcast",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT, 
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
  },
  test: {
    username: process.env.DB_USER_TEST || process.env.DB_USER,
    password: process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || process.env.DB_NAME,
    host: process.env.DB_HOST_TEST || process.env.DB_HOST,
    port: process.env.DB_PORT_TEST || process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER_PROD || process.env.DB_USER,
    password: process.env.DB_PASSWORD_PROD || process.env.DB_PASSWORD,
    database: process.env.DB_NAME_PROD || process.env.DB_NAME,
    host: process.env.DB_HOST_PROD || process.env.DB_HOST,
    port: process.env.DB_PORT_PROD || process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true',
    },
  }
};