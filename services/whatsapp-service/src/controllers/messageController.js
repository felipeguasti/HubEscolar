const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');
const Message = require('../models/message');
const { Op } = require('sequelize');

class MessageController {
    async sendMessage(req, res) {
        try {
            const { phone, message, sessionId = 'default', userId, userName } = req.body;

            if (!phone || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone and message are required'
                });
            }

            // Enviar a mensagem
            const result = await whatsappService.sendMessage(phone, message, {
                sessionId,
                userId,
                userName
            });
            
            // Salvar a mensagem no banco de dados
            const savedMessage = await Message.create({
                messageId: result.messageId,
                phone: phone,
                message: message,
                status: 'sent',
                sessionId: sessionId,
                userId: userId,
                userName: userName,
                direction: 'outgoing'
            });

            // Retornar informações completas incluindo o messageId
            return res.status(200).json({
                success: true,
                messageId: result.messageId,
                message: savedMessage,
                status: 'sent',
                timestamp: new Date().toISOString()
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
            const { phone, sessionId } = req.query;
            let whereClause = {};
            
            if (phone) {
                whereClause.phone = phone;
            }
            
            if (sessionId) {
                whereClause.sessionId = sessionId;
            }
            
            let messages;
            
            if (Object.keys(whereClause).length > 0) {
                messages = await Message.findAll({
                    where: whereClause,
                    order: [['createdAt', 'DESC']],
                    limit: 100
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
            const { sessionId = 'default' } = req.query;
            const status = await whatsappService.getStatus(sessionId);
            
            return res.status(200).json({
                success: true,
                ...status
            });
        } catch (error) {
            logger.error(`Error getting status for session ${req.query.sessionId || 'default'}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Error getting WhatsApp status',
                error: error.message
            });
        }
    }

    async getAllSessions(req, res) {
        try {
            const sessions = whatsappService.getAllSessions();
            
            return res.status(200).json({
                success: true,
                data: sessions
            });
        } catch (error) {
            logger.error('Error getting all sessions:', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting sessions information',
                error: error.message
            });
        }
    }

    async getMessageStatus(req, res) {
        try {
            const { messageId } = req.params;
            
            if (!messageId) {
                return res.status(400).json({
                    success: false,
                    message: 'Message ID is required'
                });
            }
            
            logger.info(`Checking status for message ID: ${messageId}`);
            
            // Tente encontrar a mensagem no banco de dados
            const message = await Message.findOne({
                where: { messageId: messageId }
            });
            
            if (!message) {
                // Se não encontrar no banco, tente por ID parcial
                const possibleMessages = await Message.findAll({
                    where: {
                        messageId: {
                            [Op.like]: `%${messageId}%` // Usando Sequelize Op para pesquisa parcial
                        }
                    },
                    limit: 5
                });
                
                if (possibleMessages && possibleMessages.length > 0) {
                    return res.status(200).json({
                        success: true,
                        message: 'Found possible matches',
                        data: possibleMessages
                    });
                }
                
                return res.status(404).json({
                    success: false,
                    message: `Message with ID ${messageId} not found`
                });
            }
            
            // Se encontrou a mensagem, retorne os dados dela
            return res.status(200).json({
                success: true,
                data: {
                    messageId: message.messageId,
                    status: message.status || 'sent', 
                    phone: message.phone,
                    message: message.message,
                    sessionId: message.sessionId,
                    sentBy: message.userName || message.userId,
                    sentAt: message.createdAt,
                    updatedAt: message.updatedAt
                }
            });
        } catch (error) {
            logger.error(`Error getting message status for ${req.params.messageId}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Error getting message status',
                error: error.message
            });
        }
    }

    // Adicione este método à classe MessageController
    async getBatchMessageStatus(req, res) {
        try {
            const { messageIds } = req.body;
            
            if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Array of message IDs is required'
                });
            }
            
            logger.info(`Checking status for ${messageIds.length} messages`);
            
            // Buscar status de todas as mensagens solicitadas
            const messages = await Message.findAll({
                where: { 
                    messageId: { 
                        [Op.in]: messageIds 
                    } 
                },
                attributes: ['messageId', 'status', 'updatedAt', 'phone']
            });
            
            // Mapear resultados para formato mais amigável
            const results = {};
            messages.forEach(msg => {
                results[msg.messageId] = {
                    status: msg.status || 'sent',
                    updatedAt: msg.updatedAt,
                    phone: msg.phone
                };
            });
            
            // Identificar IDs não encontrados
            const foundIds = messages.map(m => m.messageId);
            const notFound = messageIds.filter(id => !foundIds.includes(id));
            
            return res.status(200).json({
                success: true,
                results,
                notFound,
                count: messages.length
            });
        } catch (error) {
            logger.error('Error getting batch message status:', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting batch message status',
                error: error.message
            });
        }
    }
}

module.exports = new MessageController();