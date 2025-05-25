const whatsappConfig = require('../config/whatsapp');
const logger = require('../utils/logger');
const Message = require('../models/message');
const fs = require('fs');
const path = require('path');

class WhatsAppService {
    /**
     * Inicializar o serviço WhatsApp
     * @param {string} sessionId - ID opcional da sessão para inicializar
     */
    async initialize(sessionId) {
        try {
            if (sessionId) {
                // Inicializar uma sessão específica
                await whatsappConfig.getClient(sessionId);
                logger.info(`WhatsApp service initialized for session ${sessionId}`);
            } else {
                // Não inicializa nenhum cliente por padrão
                logger.info('WhatsApp service base initialized successfully');
            }
        } catch (error) {
            logger.error('Failed to initialize WhatsApp service:', error);
            throw error;
        }
    }

    /**
     * Enviar mensagem
     * @param {string} phone - número de telefone
     * @param {string} message - texto da mensagem
     * @param {Object} options - opções adicionais (sessionId, userId, etc)
     * @returns {Object} resultado do envio
     */
    async sendMessage(phone, message, options = {}) {
        const { sessionId = 'default', userId, userName } = options;
        
        try {
            // Obter cliente para a sessão específica
            const client = await whatsappConfig.getClient(sessionId);
            
            // Enviar a mensagem
            const result = await whatsappConfig.sendMessage(phone, message, sessionId);
            
            // Registrar mensagem no banco de dados
            await Message.create({
                phone: phone,
                message: message,
                type: 'sent',
                status: result.status,
                sessionId: sessionId,
                metadata: {
                    messageId: result.messageId,
                    timestamp: new Date().toISOString(),
                    userId,
                    userName
                }
            });
            
            return result;
        } catch (error) {
            logger.error(`Error sending message to ${phone} using session ${sessionId}: ${error.message}`);
            
            // Registrar falha no banco mesmo assim
            await Message.create({
                phone: phone,
                message: message,
                type: 'sent',
                status: 'failed',
                sessionId: sessionId,
                metadata: {
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    userId,
                    userName
                }
            });
            
            throw error;
        }
    }

    /**
     * Obter status de uma sessão
     * @param {string} sessionId - ID da sessão
     * @returns {Object} status da sessão
     */
    async getStatus(sessionId = 'default') {
        try {
            // Verificar se o cliente existe
            const connected = whatsappConfig.isConnected(sessionId);
            const phone = connected ? await this.getPhoneNumber(sessionId) : null;
            
            return {
                success: true,
                connected,
                phoneNumber: phone,
                status: connected ? 'ready' : 'disconnected',
                sessionId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error(`Error getting WhatsApp status for session ${sessionId}:`, error);
            return { 
                success: false, 
                status: 'error', 
                error: error.message,
                sessionId 
            };
        }
    }

    /**
     * Obter o número de telefone do WhatsApp conectado
     * @param {string} sessionId - ID da sessão
     * @returns {string} número de telefone formatado
     */
    async getPhoneNumber(sessionId = 'default') {
        try {
            const client = await whatsappConfig.getClient(sessionId);
            
            // Tentar obter o número de telefone de diferentes maneiras
            // dependendo da versão da biblioteca
            let phoneNumber = null;
            
            if (client.info && client.info.wid) {
                // Versão mais recente
                phoneNumber = client.info.wid.user;
            } else if (typeof client.getWid === 'function') {
                // Método antigo (algumas versões)
                const wid = await client.getWid();
                phoneNumber = wid ? wid.user : null;
            } else if (client.info && client.info.me) {
                // Outra possível implementação
                phoneNumber = client.info.me.user;
            } else {
                // Tentar obter o número através de outros métodos
                const info = await client.getState();
                if (info && info.wid) {
                    phoneNumber = info.wid.user;
                }
            }
            
            return phoneNumber;
        } catch (error) {
            logger.error(`Error getting phone number for session ${sessionId}:`, error);
            return null;
        }
    }

    /**
     * Obter stream do QR code
     * @param {string} sessionId - ID da sessão
     * @returns {ReadStream} stream do QR code
     */
    async getQRCodeStream(sessionId = 'default') {
        try {
            // Garantir que o cliente está inicializado
            await whatsappConfig.getClient(sessionId);
            
            // Obter caminho do QR code
            const qrPath = whatsappConfig.getQrCodePath(sessionId);
            
            if (qrPath && fs.existsSync(qrPath)) {
                return fs.createReadStream(qrPath);
            }
            
            return null;
        } catch (error) {
            logger.error(`Error getting QR code for session ${sessionId}:`, error);
            return null;
        }
    }

    /**
     * Desconectar sessão WhatsApp
     * @param {string} sessionId - ID da sessão
     * @returns {Object} resultado da desconexão
     */
    async disconnect(sessionId = 'default') {
        try {
            const result = await whatsappConfig.disconnect(sessionId);
            
            return {
                success: true,
                message: `WhatsApp session ${sessionId} disconnected successfully`,
                sessionId
            };
        } catch (error) {
            logger.error(`Error disconnecting WhatsApp session ${sessionId}:`, error);
            return {
                success: false,
                message: `Error disconnecting WhatsApp session ${sessionId}`,
                error: error.message,
                sessionId
            };
        }
    }

    /**
     * Listar todas as sessões ativas
     * @returns {Array} lista de sessões
     */
    getAllSessions() {
        return whatsappConfig.getAllSessions();
    }
    
    /**
     * Resetar uma sessão do WhatsApp
     * @param {string} sessionId - ID da sessão a ser resetada
     * @returns {Object} resultado da operação
     */
    async resetSession(sessionId = 'default') {
        try {
            logger.info(`Iniciando reset da sessão ${sessionId}`);
            
            // Primeiro, desconectar a sessão atual
            await whatsappConfig.disconnect(sessionId);
            logger.info(`Sessão ${sessionId} desconectada`);
            
            // Limpar arquivos da sessão (o LocalAuth armazena os dados em .wwebjs_auth)
            const sessionDir = path.join(process.cwd(), '.wwebjs_auth', 'session-' + sessionId);
            if (fs.existsSync(sessionDir)) {
                // Remover diretório completo da sessão
                await fs.promises.rm(sessionDir, { recursive: true, force: true });
                logger.info(`Diretório da sessão ${sessionId} removido: ${sessionDir}`);
            }
            
            // Remover o QR code se existir
            const qrPath = whatsappConfig.getQrCodePath(sessionId);
            if (qrPath && fs.existsSync(qrPath)) {
                await fs.promises.unlink(qrPath);
                logger.info(`QR code da sessão ${sessionId} removido`);
            }
            
            // Inicializar uma nova sessão
            await whatsappConfig.initializeClient(sessionId);
            logger.info(`Nova sessão ${sessionId} inicializada`);
            
            return {
                success: true,
                message: `Sessão ${sessionId} resetada com sucesso`,
                sessionId
            };
        } catch (error) {
            logger.error(`Erro ao resetar sessão ${sessionId}:`, error);
            return {
                success: false,
                message: `Erro ao resetar sessão ${sessionId}`,
                error: error.message,
                sessionId
            };
        }
    }
}

module.exports = new WhatsAppService();