const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');
const Message = require('../models/message');

class MessageController {
    async sendMessage(req, res) {
        try {
            const { phone, message } = req.body;

            if (!phone || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone and message are required'
                });
            }

            const result = await whatsappService.sendMessage(phone, message);
            
            // Salvar mensagem no banco
            await Message.create({
                phone,
                message,
                type: 'sent',
                status: result.status
            });

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error sending message:', error);
            return res.status(500).json({
                success: false,
                message: 'Error sending message',
                error: error.message
            });
        }
    }

    async getMessages(req, res) {
        try {
            const { phone } = req.query;
            let messages;

            if (phone) {
                messages = await Message.findAll({
                    where: { phone },
                    order: [['createdAt', 'DESC']]
                });
            } else {
                messages = await Message.findAll({
                    order: [['createdAt', 'DESC']],
                    limit: 100
                });
            }

            return res.status(200).json({
                success: true,
                data: messages
            });
        } catch (error) {
            logger.error('Error fetching messages:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching messages',
                error: error.message
            });
        }
    }

    async getStatus(req, res) {
        try {
            const status = await whatsappService.getStatus();
            return res.status(200).json({
                success: true,
                data: status
            });
        } catch (error) {
            logger.error('Error getting status:', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting WhatsApp status',
                error: error.message
            });
        }
    }
}

module.exports = new MessageController();