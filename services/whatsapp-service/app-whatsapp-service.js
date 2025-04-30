require('dotenv').config();
const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

// Inicialização do Express
const app = express();
const PORT = process.env.PORT || 3006;

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Cliente WhatsApp com autenticação local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Estado da conexão WhatsApp
let isReady = false;

// Eventos do WhatsApp
client.on('qr', async (qr) => {
    logger.info('QR Code recebido');
    try {
        const qrCode = await qrcode.toDataURL(qr);
        global.latestQR = qrCode;
        logger.info('QR Code gerado com sucesso');
    } catch (err) {
        logger.error('Erro ao gerar QR code:', err);
    }
});

client.on('ready', () => {
    isReady = true;
    logger.info('Cliente WhatsApp está pronto e conectado!');
});

client.on('authenticated', () => {
    logger.info('WhatsApp autenticado com sucesso');
});

client.on('auth_failure', (err) => {
    logger.error('Falha na autenticação:', err);
    isReady = false;
});

client.on('disconnected', (reason) => {
    isReady = false;
    logger.warn('Cliente WhatsApp desconectado:', reason);
});

// Rotas básicas
app.get('/status', (req, res) => {
    res.json({
        status: isReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

app.get('/qr', (req, res) => {
    if (global.latestQR) {
        res.json({ qrCode: global.latestQR });
    } else {
        res.status(404).json({ error: 'QR Code não disponível' });
    }
});

// Middleware de Erro
app.use((err, req, res, next) => {
    logger.error('Erro na aplicação:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicialização do servidor
const startServer = async () => {
    try {
        logger.info('Iniciando servidor WhatsApp...');
        await client.initialize();
        
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
});

startServer();