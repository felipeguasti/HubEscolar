require('dotenv').config();
const express = require('express');
const cors = require('cors');
const districtsRoutes = require('./src/routes/districts');
const healthRoutes = require('./src/routes/health');
const errorHandler = require('./src/middlewares/errorHandler');
const rateLimiter = require('./src/middlewares/rateLimiter');
const sanitizer = require('./src/middlewares/sanitizer');
const cacheService = require('./src/services/cacheService');
const logger = require('./src/utils/logger');

const app = express();

// Middleware para sanitização
app.use(sanitizer);

// Configuração do CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(express.json());

// Rate limiting
app.use(rateLimiter);

// Rotas
app.use('/districts', districtsRoutes);
app.use('/health', healthRoutes);

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicialização do servidor
const PORT = process.env.PORT || 3003;

// Testar conexão com Redis
cacheService.client.on('connect', () => {
    logger.info('Conectado ao Redis com sucesso');
});

cacheService.client.on('error', (err) => {
    logger.error('Erro na conexão com Redis:', err);
});

app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`);
});

module.exports = app; 