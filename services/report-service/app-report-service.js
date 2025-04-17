const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const sequelize = require('./src/config/db');
const Report = require('./src/models/Report');
const reportRoutes = require('./src/routes/reportRoutes');
const ollamaRoutes = require('./src/routes/ollamaRoutes');
const logger = require('./src/services/loggingService');

const app = express();
const port = process.env.REPORT_SERVICE_PORT || 3005;

// Middleware para fazer o parsing do corpo das requisições como JSON
app.use(bodyParser.json());

// Middleware para logar as requisições
app.use((req, res, next) => {
    logger.info(`[${req.method}] ${req.originalUrl}`);
    next();
});

// Usar as rotas
app.use('/reports', reportRoutes);
app.use('/ai', ollamaRoutes);

// Rota de status
app.get('/status', (req, res) => {
    res.status(200).json({ message: 'Microserviço de Relatórios está online!' });
});

// Middleware para tratamento de erros global
app.use((err, req, res, next) => {
    logger.error('Erro na requisição:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
});

// Inicializar banco de dados e servidor
const initializeServer = async () => {
    try {
        await sequelize.sync();
        logger.info('Banco de dados sincronizado com sucesso');

        app.listen(port, () => {
            logger.info(`Servidor rodando em http://localhost:${port}`);
        });
    } catch (error) {
        logger.error('Erro ao inicializar o servidor:', error);
        process.exit(1);
    }
};

initializeServer();