const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const routes = require('./src/routes/users');
const db = require('./src/config/db');
const logger = require('./src/services/logService');
require('dotenv').config();

const app = express();
const port = process.env.USERS_SERVICE_PORT || 3001;

// Middleware para logar todas as requisições
app.use(async (req, res, next) => {
    const startTime = Date.now();
    
    // Registrar o início da requisição
    await logger.debug('Requisição recebida', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });
    
    // Interceptar o final da resposta para registrar o tempo total
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;
        
        // Registrar o fim da requisição
        logger.debug('Resposta enviada', {
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            responseTime: `${responseTime}ms`
        }).catch(err => {
            console.error('Erro ao registrar log de resposta:', err);
        });
        
        return originalEnd.call(this, chunk, encoding);
    };
    
    next();
});

// Middlewares padrão
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Rotas
app.use('/users', routes);

// Sincronização do banco de dados com tratamento de erros adequado
db.sync({ alter: true })
  .then(() => {
    logger.info('Database synchronized with altered models');
  })
  .catch((error) => {
    logger.error('Error synchronizing database:', error);
  });

// Middleware de erro melhorado
app.use((error, req, res, next) => {
    // Usar o logger em vez de console.error
    logger.error('Erro na aplicação', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ error: 'Erro interno do servidor.' });
    next();
});

// Inicialização do servidor
app.listen(port, () => {
    logger.info(`Serviço de usuários iniciado`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;