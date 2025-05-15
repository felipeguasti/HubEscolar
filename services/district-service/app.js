require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const districtsRoutes = require('./src/routes/districts');
const healthRoutes = require('./src/routes/health');
const errorHandler = require('./src/middlewares/errorHandler');
const { requireAuth, requireRole } = require('./src/middlewares/auth');
const sanitizer = require('./src/middlewares/sanitizer');
const cacheService = require('./src/services/cacheService');
const logger = require('./src/utils/logger');

const app = express();

// Log inicial
logger.info('Iniciando configuração do servidor...');

// Middleware para sanitização
app.use(sanitizer);
logger.info('Middleware de sanitização configurado');

// Configuração do CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
logger.info('CORS configurado');

// Aplicar middleware de autenticação apenas nas rotas que precisam
app.use('/districts', requireAuth);
logger.info('Middleware de autenticação configurado para rotas /districts');

// Configuração do rate limiter
logger.info('Configurando rate limiter...');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: (req) => {
        logger.debug(`Rate limit check - User: ${req.user?.id}, Role: ${req.user?.role}`);
        
        if (req.user) {
            return 1000; // 1000 requisições para usuários logados
        }
        return 100; // 100 requisições para não autenticados
    },
    message: (req) => ({
        error: req.user 
            ? 'Limite de requisições excedido para usuário autenticado' 
            : 'Muitas requisições deste IP, por favor tente novamente mais tarde'
    }),
    standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
    legacyHeaders: false, // Não retorna os headers `X-RateLimit-*` legados
    skip: (req) => {
        // Adiciona log para debug do skip
        logger.debug(`Skip check - User Role: ${req.user?.role}`);
        return req.user?.role === 'Master';
    }
});
logger.info('Rate limiter configurado');

// Rotas
app.use('/districts', limiter, districtsRoutes);
app.use('/health', healthRoutes);
logger.info('Rotas configuradas');

// Middleware de tratamento de erros
app.use(errorHandler);
logger.info('Middleware de erro configurado');

// Inicialização do servidor
const PORT = process.env.PORT || 3003;
logger.info(`Tentando iniciar servidor na porta ${PORT}...`);

// Iniciar o servidor diretamente
const server = app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`);
});

// Debug para conexão do servidor
server.on('listening', () => {
    logger.info('Servidor está escutando com sucesso');
});

// Tratamento de erros do servidor
server.on('error', (err) => {
    logger.error(`Erro ao iniciar servidor: ${err.message}`);
    logger.error('Stack trace:', err.stack);
    process.exit(1);
});

// Tratamento de sinais de término
process.on('SIGTERM', () => {
    logger.info('Recebido sinal SIGTERM. Encerrando servidor...');
    server.close(() => {
        logger.info('Servidor encerrado via SIGTERM');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('Recebido sinal SIGINT. Encerrando servidor...');
    server.close(() => {
        logger.info('Servidor encerrado via SIGINT');
        process.exit(0);
    });
});

// Debug para process events
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

logger.info('Configuração do servidor concluída');

module.exports = app;