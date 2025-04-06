// app-school-service.js
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize } = require('sequelize');
const schoolRoutes = require('./src/routes/schools');
require('dotenv').config();
const app = express();
const port = process.env.SCHOOL_SERVICE_PORT || 3002;
const authMiddleware = require('./src/middlewares/auth');
const morgan = require('morgan');
const logger = require('./src/services/loggingService');
const { handleServiceError } = require('./src/services/errorHandlingService');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // Importe o rateLimit

// Middleware para analisar o corpo das requisições com limite de tamanho
app.use(bodyParser.json({ limit: '100kb' })); // Limita o tamanho do corpo JSON para 100KB
// Se você estiver usando urlencoded também, adicione o limite aqui:
// app.use(bodyParser.urlencoded({ extended: true, limit: '100kb' }));

// Use o helmet para segurança dos headers HTTP
app.use(helmet());

// Configuração do rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP dentro da janela de tempo
  message: 'Muitas requisições foram feitas deste IP, por favor, tente novamente após 15 minutos.',
  standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Não retorna os headers `X-RateLimit-*` legados
});

// Aplica o rate limiter a todas as rotas
app.use(limiter);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'mysql',
  }
);

// Teste a conexão com o banco de dados
sequelize
  .authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
  })
  .catch((err) => {
    console.error('Não foi possível conectar ao banco de dados:', err);
  });

// Stream para o Winston
const logStream = {
  write: message => logger.http(message.trim()),
};

// Middleware de logging HTTP com Morgan
app.use(morgan('combined', { stream: logStream }));

// Monta as rotas sob o prefixo /schools
app.use('/schools', schoolRoutes);

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', err.stack);
  return handleServiceError(res, err); // Utilize seu serviço de tratamento de erros
});

app.listen(port, () => {
  console.log(`Serviço de escolas rodando na porta ${port}`);
});

module.exports = app;