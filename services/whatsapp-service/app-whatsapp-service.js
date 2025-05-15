require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./src/utils/logger');
const whatsappService = require('./src/services/whatsappService');
const messageRoutes = require('./src/routes/messageRoutes');
const errorHandler = require('./src/middlewares/error');

// Inicialização do Express
const app = express();
const PORT = process.env.PORT || 3006;

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/messages', messageRoutes);

// Rota de status
app.get('/status', async (req, res) => {
    const status = await whatsappService.getStatus();
    res.json(status);
});

// Middleware de Erro
app.use(errorHandler);

// Inicialização do servidor
const startServer = async () => {
    try {
        logger.info('Iniciando servidor WhatsApp...');
        await whatsappService.initialize();
        
        app.listen(PORT, () => {
            logger.info(`Servidor WhatsApp rodando na porta ${PORT}`);
        });
    } catch (error) {
        logger.error('Erro ao inicializar o servidor:', error);
        process.exit(1);
    }
};

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

startServer();