const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class WhatsAppConfig {
    constructor() {
        this.clients = new Map(); // Mapa para armazenar múltiplos clientes
        this.qrDir = path.join(__dirname, '../../qrcodes');
        
        // Criar diretório para QR codes se não existir
        if (!fs.existsSync(this.qrDir)) {
            fs.mkdirSync(this.qrDir, { recursive: true });
        }
    }

    /**
     * Obter ou criar um cliente WhatsApp para uma escola específica
     * @param {string} schoolId - ID da escola
     * @returns {Object} cliente whatsapp
     */
    async getClient(schoolId = 'default') {
        // Converter para string para garantir compatibilidade como chave no Map
        const sessionId = String(schoolId);
        
        // Se o cliente já existe, retorná-lo
        if (this.clients.has(sessionId) && this.clients.get(sessionId).isInitialized) {
            return this.clients.get(sessionId).client;
        }
        
        // Se o cliente não existe, criá-lo
        return await this.initializeClient(sessionId);
    }

    /**
     * Inicializar um novo cliente WhatsApp
     * @param {string} sessionId - ID da sessão (ID da escola)
     * @returns {Client} cliente whatsapp inicializado
     */
    async initializeClient(sessionId) {
        try {
            logger.info(`Inicializando cliente WhatsApp para sessão: ${sessionId}`);
            
            // Criar diretório específico para a sessão
            const sessionDir = path.join(this.qrDir, sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            
            // Caminho para o QR code desta sessão
            const qrPath = path.join(sessionDir, 'qrcode.png');
            
            // Inicializar o cliente com autenticação local específica para esta sessão
            const client = new Client({
                authStrategy: new LocalAuth({ clientId: sessionId }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ],
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH // opcional, se você quiser especificar um caminho para o Chrome
                }
            });
            
            // Armazenar cliente e metadados no mapa
            this.clients.set(sessionId, {
                client,
                isReady: false,
                isInitialized: false,
                qrPath
            });
            
            // Configurar eventos
            client.on('qr', async (qr) => {
                logger.info(`QR Code recebido para sessão ${sessionId}, salvando imagem...`);
                
                // Remover QR code antigo se existir
                if (fs.existsSync(qrPath)) {
                    try {
                        fs.unlinkSync(qrPath);
                    } catch (err) {
                        logger.warn(`Não foi possível remover QR code antigo: ${err.message}`);
                    }
                }
                
                // Salvar como arquivo PNG
                await qrcode.toFile(qrPath, qr, {
                    type: 'png',
                    width: 250,
                    margin: 1
                });
                
                logger.info(`QR Code para sessão ${sessionId} salvo em: ${qrPath}`);
            });
            
            client.on('ready', () => {
                logger.info(`Cliente WhatsApp para sessão ${sessionId} está pronto!`);
                const clientData = this.clients.get(sessionId);
                if (clientData) {
                    clientData.isReady = true;
                    this.clients.set(sessionId, clientData);
                }
            });
            
            client.on('authenticated', () => {
                logger.info(`Sessão ${sessionId} autenticada com sucesso no WhatsApp`);
            });
            
            client.on('auth_failure', (msg) => {
                logger.error(`Falha na autenticação para sessão ${sessionId}: ${msg}`);
                const clientData = this.clients.get(sessionId);
                if (clientData) {
                    clientData.isReady = false;
                    this.clients.set(sessionId, clientData);
                }
            });
            
            client.on('disconnected', () => {
                logger.info(`Sessão ${sessionId} desconectada`);
                const clientData = this.clients.get(sessionId);
                if (clientData) {
                    clientData.isReady = false;
                    this.clients.set(sessionId, clientData);
                }
            });
            
            // Inicializar o cliente
            await client.initialize();
            
            // Atualizar estado do cliente
            const clientData = this.clients.get(sessionId);
            if (clientData) {
                clientData.isInitialized = true;
                this.clients.set(sessionId, clientData);
            }
            
            return client;
        } catch (error) {
            logger.error(`Erro ao inicializar o cliente WhatsApp para sessão ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Verificar se um cliente está conectado
     * @param {string} sessionId - ID da sessão
     * @returns {boolean} status de conexão
     */
    isConnected(sessionId = 'default') {
        const clientData = this.clients.get(String(sessionId));
        return clientData ? clientData.isReady : false;
    }

    /**
     * Divide uma mensagem longa em partes menores para envio
     * @param {string} message - A mensagem completa
     * @param {number} maxLength - Tamanho máximo de cada parte (padrão: 4000 caracteres)
     * @returns {Array} Array com as partes da mensagem
     */
    splitMessage(text, maxLength = 4000) {
        const parts = [];
        let remaining = text;
        
        while (remaining.length > 0) {
            // Se a mensagem é menor que o limite máximo, enviar toda
            if (remaining.length <= maxLength) {
                parts.push(remaining);
                break;
            }
            
            // Procurar um bom ponto de quebra
            let breakPoint = maxLength;
            const possibleBreaks = ['\n\n', '\n', '. ', ', ', ' '];
            
            for (const breakChar of possibleBreaks) {
                const lastBreak = remaining.lastIndexOf(breakChar, maxLength);
                if (lastBreak > maxLength * 0.7) { // Pelo menos 70% da mensagem
                    breakPoint = lastBreak + (breakChar === '. ' || breakChar === ', ' ? 1 : 0);
                    break;
                }
            }
            
            // Adicionar a parte atual
            parts.push(remaining.substring(0, breakPoint).trim());
            remaining = remaining.substring(breakPoint).trim();
        }
        
        // Adicionar numeração às partes
        return parts.map((part, index) => 
            parts.length > 1 ? `[${index + 1}/${parts.length}] ${part}` : part
        );
    }

    /**
     * Enviar mensagem usando um cliente específico
     * @param {string} phone - número de telefone
     * @param {string} text - texto da mensagem
     * @param {string} sessionId - ID da sessão
     * @returns {Object} resultado do envio
     */
    async sendMessage(phone, text, sessionId = 'default') {
        const clientData = this.clients.get(String(sessionId));
        
        if (!clientData || !clientData.isReady) {
            throw new Error(`Cliente WhatsApp para sessão ${sessionId} não está pronto`);
        }
        
        try {
            // Formatar o número de telefone
            const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;
            
            // Verificar se a mensagem precisa ser dividida
            if (text.length > 4000) {
                logger.info(`Mensagem longa (${text.length} caracteres) sendo dividida em partes menores`);
                const messageParts = this.splitMessage(text);
                
                const results = [];
                // Enviar cada parte da mensagem
                for (const part of messageParts) {
                    const result = await clientData.client.sendMessage(formattedPhone, part);
                    results.push({
                        status: 'sent',
                        messageId: result.id.id,
                        sessionId
                    });
                    
                    // Pequeno delay entre as mensagens para evitar bloqueios
                    if (messageParts.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                return {
                    status: 'sent',
                    multipart: true,
                    parts: results.length,
                    results
                };
            }
            
            // Para mensagens que não precisam ser divididas
            const result = await clientData.client.sendMessage(formattedPhone, text);
            return {
                status: 'sent',
                messageId: result.id.id,
                sessionId
            };
        } catch (error) {
            logger.error(`Erro ao enviar mensagem pela sessão ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Obter caminho do QR code para uma sessão
     * @param {string} sessionId - ID da sessão
     * @returns {string} caminho do arquivo QR code
     */
    getQrCodePath(sessionId = 'default') {
        const clientData = this.clients.get(String(sessionId));
        return clientData ? clientData.qrPath : null;
    }

    /**
     * Desconectar um cliente específico
     * @param {string} sessionId - ID da sessão
     */
    async disconnect(sessionId = 'default') {
        const clientData = this.clients.get(String(sessionId));
        
        if (clientData && clientData.client) {
            try {
                logger.info(`Desconectando sessão ${sessionId}...`);
                await clientData.client.destroy();
                this.clients.delete(String(sessionId));
                logger.info(`Sessão ${sessionId} desconectada com sucesso`);
                return true;
            } catch (error) {
                logger.error(`Erro ao desconectar sessão ${sessionId}:`, error);
                throw error;
            }
        }
        
        return false;
    }

    /**
     * Obter informações sobre todas as sessões ativas
     * @returns {Array} lista de sessões
     */
    getAllSessions() {
        const sessions = [];
        
        for (const [sessionId, clientData] of this.clients.entries()) {
            sessions.push({
                sessionId,
                isReady: clientData.isReady,
                isInitialized: clientData.isInitialized
            });
        }
        
        return sessions;
    }

    
}

module.exports = new WhatsAppConfig();