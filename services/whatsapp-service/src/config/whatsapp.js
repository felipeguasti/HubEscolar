const venom = require('venom-bot');
const logger = require('../utils/logger');

class WhatsAppConfig {
    constructor() {
        this.client = null;
    }

    async initialize() {
        try {
            this.client = await venom.create({
                session: 'hubescolar-whatsapp',
                multidevice: true,
                logger: logger,
                catchQR: (base64Qr, asciiQR) => {
                    logger.info('QR Code gerado. Escaneie para autenticar.');
                },
                statusFind: (statusSession, session) => {
                    logger.info(`Status da sessão: ${statusSession}`);
                },
                headless: true,
                useChrome: false,
                debug: false,
            });

            logger.info('WhatsApp client initialized successfully');
            return this.client;
        } catch (error) {
            logger.error('Error initializing WhatsApp client:', error);
            throw error;
        }
    }

    getClient() {
        if (!this.client) {
            throw new Error('WhatsApp client not initialized');
        }
        return this.client;
    }

    async closeConnection() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            logger.info('WhatsApp connection closed');
        }
    }
}

module.exports = new WhatsAppConfig();