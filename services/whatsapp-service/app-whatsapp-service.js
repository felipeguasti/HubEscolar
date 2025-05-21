require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const logger = require('./src/utils/logger');
const whatsappService = require('./src/services/whatsappService');
const messageRoutes = require('./src/routes/messageRoutes');
const authRoutes = require('./src/routes/authRoutes');
const errorHandler = require('./src/middlewares/error');
const websockets = require('./src/config/websockets'); 
const sequelize = require('./src/config/database');


// Sincronização do banco de dados com tratamento de erros adequado
sequelize.sync({ alter: true })
  .then(() => {
    logger.info('Database synchronized with altered models');
  })
  .catch((error) => {
    logger.error('Error synchronizing database:', error);
  });

// Inicialização do Express
const app = express();
const PORT = process.env.PORT || 3006;

// Criar servidor HTTP (necessário para WebSocket)
const server = http.createServer(app);

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/whatsapp/messages', messageRoutes);
app.use('/whatsapp/auth', authRoutes);

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
        
        // Inicializar o WebSocket Server
        const wsServer = websockets.initialize(server);
        
        // Usar server.listen em vez de app.listen
        server.listen(PORT, () => {
            logger.info(`Servidor WhatsApp rodando na porta ${PORT}`);
            logger.info(`WebSocket server disponível em ws://localhost:${PORT}/ws`);
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