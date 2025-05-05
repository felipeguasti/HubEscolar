const whatsappConfig = require('../config/whatsapp');
const logger = require('../utils/logger');
const Message = require('../models/message');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            this.client = await whatsappConfig.initialize();
            this.isInitialized = true;
            logger.info('WhatsApp service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize WhatsApp service:', error);
            throw error;
        }
    }

    async sendMessage(phone, message) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Formatar número do telefone
            const formattedPhone = phone.replace(/\D/g, '');
            
            // Enviar mensagem
            const result = await this.client.sendText(`${formattedPhone}@c.us`, message);
            
            logger.info(`Message sent to ${phone} successfully`);

            return {
                status: 'sent',
                messageId: result.id,
                timestamp: result.timestamp
            };

        } catch (error) {
            logger.error(`Error sending message to ${phone}:`, error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    async getStatus() {
        try {
            if (!this.isInitialized) {
                return { status: 'disconnected' };
            }

            const status = await this.client.getConnectionState();
            return { status };

        } catch (error) {
            logger.error('Error getting WhatsApp status:', error);
            return { status: 'error', error: error.message };
        }
    }

    async handleIncomingMessage(message) {
        try {
            // Salvar mensagem recebida no banco
            await Message.create({
                phone: message.from.replace('@c.us', ''),
                message: message.body,
                type: 'received',
                status: 'delivered',
                metadata: {
                    messageId: message.id,
                    timestamp: message.timestamp
                }
            });

            logger.info(`Incoming message saved from ${message.from}`);

        } catch (error) {
            logger.error('Error handling incoming message:', error);
            throw error;
        }
    }

    async closeConnection() {
        try {
            await whatsappConfig.closeConnection();
            this.isInitialized = false;
            this.client = null;
            logger.info('WhatsApp service connection closed');
        } catch (error) {
            logger.error('Error closing WhatsApp connection:', error);
            throw error;
        }
    }
}

module.exports = new WhatsAppService();