const axios = require('axios');
const logger = require('../utils/logger');

// Obter URL do serviço WhatsApp do .env
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3006';

// Token global para uso interno do serviço
let authToken = null;

const whatsappService = {
    /**
     * Define o token de autenticação para o serviço
     * @param {string} token - JWT token
     */
    setAuthToken: (token) => {
        authToken = token;
        logger.debug('Token de autenticação configurado no whatsappService');
    },

    /**
     * Obtém o stream do QR Code para autenticação
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação opcional (sobrescreve o token global)
     */
    getQRCodeStream: async (schoolId, token = null) => {
        try {
            logger.info(`Obtendo QR Code para escola ID: ${schoolId || 'default'}`);
            
            // Usar token fornecido ou o token global
            const useToken = token || authToken;
            
            const response = await axios({
                method: 'get',
                url: `${WHATSAPP_SERVICE_URL}/whatsapp/auth/qrcode${schoolId ? `?sessionId=${schoolId}` : ''}`,
                responseType: 'stream',
                headers: { 
                    Authorization: useToken ? `Bearer ${useToken}` : undefined
                }
            });
            
            return response.data;
        } catch (error) {
            logger.error(`Erro ao obter QR code stream para escola ${schoolId}: ${error.message}`);
            return null;
        }
    },

    /**
     * Obtém o HTML da página de conexão
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação
     */
    getConnectPageHTML: async (schoolId, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            logger.info(`Obtendo página de conexão para escola ID: ${schoolId || 'default'}`);
            
            const response = await axios.get(
                `${WHATSAPP_SERVICE_URL}/whatsapp/auth/connect${schoolId ? `?sessionId=${schoolId}` : ''}`,
                { 
                    headers: { 
                        Authorization: useToken ? `Bearer ${useToken}` : undefined
                    } 
                }
            );
            
            // Modifica URLs no HTML para apontar para o sistema principal
            let html = response.data;
            // Substituir todas as ocorrências de URL para incluir o schoolId
            if (schoolId) {
                html = html.replace(/\/whatsapp\/auth\/status/g, `/whatsapp/auth/status?sessionId=${schoolId}`);
                // Ajustar o script para usar o sessionId correto
                html = html.replace(/const sessionId = "default";/g, `const sessionId = "${schoolId}";`);
            }
            
            return html;
        } catch (error) {
            logger.error(`Erro ao obter HTML da página de conexão para escola ${schoolId}: ${error.message}`);
            throw error;
        }
    },

    /**
     * Verifica o status da conexão com o WhatsApp
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação
     */
    getConnectionStatus: async (schoolId, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            logger.info(`Verificando status para escola ID: ${schoolId || 'default'}`);
            
            const response = await axios.get(
                `${WHATSAPP_SERVICE_URL}/whatsapp/auth/status${schoolId ? `?sessionId=${schoolId}` : ''}`,
                { 
                    headers: { 
                        Authorization: useToken ? `Bearer ${useToken}` : undefined
                    } 
                }
            );
            
            logger.debug(`Status da conexão para escola ${schoolId}: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            logger.error(`Erro ao verificar status da conexão para escola ${schoolId}: ${error.message}`);
            throw error;
        }
    },

    /**
     * Desconecta o WhatsApp
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação
     */
    disconnect: async (schoolId, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            logger.info(`Desconectando WhatsApp para escola ID: ${schoolId || 'default'}`);
            
            const response = await axios.post(
                `${WHATSAPP_SERVICE_URL}/whatsapp/auth/disconnect`,
                schoolId ? { sessionId: schoolId } : {},
                { 
                    headers: { 
                        Authorization: useToken ? `Bearer ${useToken}` : undefined
                    } 
                }
            );
            
            return response.data;
        } catch (error) {
            logger.error(`Erro ao desconectar WhatsApp para escola ${schoolId}: ${error.message}`);
            throw error;
        }
    },

    /**
     * Envia uma mensagem via WhatsApp
     * @param {string} phone - Número de telefone do destinatário
     * @param {string} message - Texto da mensagem
     * @param {Object} options - Opções adicionais (sessionId, userId, etc)
     * @param {string} token - Token de autenticação
     */
    sendMessage: async (phone, message, options = {}, token = null) => {
        try {
            // Validar o número de telefone (remover caracteres especiais)
            const cleanPhone = phone.replace(/\D/g, '');
            
            // Verificar se temos o schoolId
            if (!options.sessionId) {
                logger.warn('Enviando mensagem sem especificar o ID da escola. Usando sessão default.');
            } else {
                logger.info(`Enviando mensagem para escola ID: ${options.sessionId}`);
            }

            // ADICIONAR: Verificar status antes de enviar
            try {
                const status = await whatsappService.getConnectionStatus(options.sessionId, token);
                if (!status.connected) {
                    throw new Error(`WhatsApp não está conectado para a sessão ${options.sessionId}. Escaneie o QR code primeiro.`);
                }
            } catch (statusError) {
                logger.error(`Erro ao verificar status antes de enviar: ${statusError.message}`);
                // Continue mesmo com erro de status para tentar o envio
            }
            
            // Preparar payload
            const payload = {
                phone: cleanPhone,
                message,
                ...options
            };
            
            logger.info(`Enviando mensagem para ${cleanPhone} usando sessionId: ${options.sessionId || 'default'}`);
            
            // Usar token fornecido ou o token global
            const useToken = token || authToken;
            
            // Enviar para o microserviço
            try {
                const response = await axios.post(
                    `${WHATSAPP_SERVICE_URL}/whatsapp/messages/send`, 
                    payload,
                    { 
                        headers: { 
                            Authorization: useToken ? `Bearer ${useToken}` : undefined
                        } 
                    }
                );
                
                return response.data;
            } catch (error) {
                // ADICIONAR: Tratamento específico para erro de WidFactory
                if (error.response?.data?.error?.includes('WidFactory')) {
                    logger.error(`Erro de WidFactory detectado. A sessão ${options.sessionId} pode estar corrompida.`);
                    throw new Error(`A sessão do WhatsApp parece estar em um estado inválido. Por favor, tente desconectar e reconectar o WhatsApp através da página de perfil da escola.`);
                }
                throw error;
            }
        } catch (error) {
            logger.error(`Erro ao enviar mensagem para ${phone}: ${error.message}`);
            throw error;
        }
    },

    /**
     * Lista as mensagens enviadas/recebidas
     * @param {Object} filters - Filtros para a busca
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação
     */
    getMessages: async (filters = {}, schoolId, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            // Adicionar schoolId aos filtros como sessionId
            const params = { 
                ...filters,
                ...(schoolId ? { sessionId: schoolId } : {})
            };
            
            const response = await axios.get(
                `${WHATSAPP_SERVICE_URL}/whatsapp/messages`, 
                { 
                    params,
                    headers: { 
                        Authorization: useToken ? `Bearer ${useToken}` : undefined
                    } 
                }
            );
            
            return response.data.messages || [];
        } catch (error) {
            logger.error(`Erro ao listar mensagens para escola ${schoolId}: ${error.message}`);
            throw error;
        }
    },

    /**
     * Verifica o status do serviço de mensagens
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação
     */
    getServiceStatus: async (schoolId, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            const url = `${WHATSAPP_SERVICE_URL}/whatsapp/messages/status`;
            const params = schoolId ? { sessionId: schoolId } : {};
            
            const response = await axios.get(
                url, 
                { 
                    params,
                    headers: { 
                        Authorization: useToken ? `Bearer ${useToken}` : undefined
                    } 
                }
            );
            return response.data;
        } catch (error) {
            logger.error(`Erro ao verificar status do serviço para escola ${schoolId}: ${error.message}`);
            
            // Se não conseguir conectar, retorna um status offline
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    status: 'offline',
                    message: 'Serviço de WhatsApp não está disponível'
                };
            }
            
            throw error;
        }
    },

    /**
     * Envia uma mensagem em lote para múltiplos destinatários
     * @param {Array} recipients - Lista de destinatários
     * @param {string} message - Texto da mensagem
     * @param {Object} options - Opções adicionais
     * @param {string} token - Token de autenticação
     */
    sendBulkMessages: async (recipients, message, options = {}, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            const results = [];
            const errors = [];
            
            // Processa cada destinatário em sequência
            for (const recipient of recipients) {
                try {
                    const result = await whatsappService.sendMessage(
                        recipient.phone, 
                        message, 
                        {
                            ...options,
                            recipientId: recipient.id,
                            recipientName: recipient.name
                        },
                        useToken
                    );
                    
                    results.push({
                        phone: recipient.phone,
                        success: true,
                        ...result
                    });
                } catch (error) {
                    errors.push({
                        phone: recipient.phone,
                        success: false,
                        error: error.message
                    });
                }
                
                // Pequena pausa entre envios para evitar bloqueios
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            return {
                success: errors.length === 0,
                totalSent: results.length,
                totalFailed: errors.length,
                results,
                errors
            };
        } catch (error) {
            logger.error(`Erro no envio em lote: ${error.message}`);
            throw error;
        }
    },
    
    /**
     * Reinicia uma sessão do WhatsApp
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação
     */
    resetSession: async (schoolId, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            logger.info(`Reiniciando sessão WhatsApp para escola ID: ${schoolId || 'default'}`);
            
            const response = await axios.post(
                `${WHATSAPP_SERVICE_URL}/whatsapp/auth/reset`,
                { sessionId: schoolId },
                { 
                    headers: { 
                        Authorization: useToken ? `Bearer ${useToken}` : undefined
                    } 
                }
            );
            
            return response.data;
        } catch (error) {
            logger.error(`Erro ao reiniciar sessão WhatsApp para escola ${schoolId}: ${error.message}`);
            throw error;
        }
    },

    /**
     * Verifica o status de uma mensagem específica
     * @param {string} messageId - ID da mensagem
     * @param {string} schoolId - ID da escola para a sessão WhatsApp
     * @param {string} token - Token de autenticação
     */
    getMessageStatus: async (messageId, schoolId, token = null) => {
        // Usar token fornecido ou o token global
        const useToken = token || authToken;
        
        try {
            logger.info(`Verificando status da mensagem ${messageId} para escola ID: ${schoolId || 'default'}`);
            
            const url = `${WHATSAPP_SERVICE_URL}/whatsapp/messages/status/${messageId}`;
            const params = schoolId ? { sessionId: schoolId } : {};
            
            const response = await axios.get(
                url, 
                { 
                    params,
                    headers: { 
                        Authorization: useToken ? `Bearer ${useToken}` : undefined
                    } 
                }
            );
            
            return response.data;
        } catch (error) {
            logger.error(`Erro ao verificar status da mensagem ${messageId} para escola ${schoolId}: ${error.message}`);
            
            // Se a resposta contiver dados, retorná-los mesmo em caso de erro
            if (error.response && error.response.data) {
                return {
                    success: false,
                    ...error.response.data
                };
            }
            
            // Se for erro de conexão, retornar status unknown
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    status: 'unknown',
                    message: 'Serviço de WhatsApp não está disponível'
                };
            }
            
            throw error;
        }
    },
};

module.exports = whatsappService;