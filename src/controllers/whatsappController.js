const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

const whatsappController = {
    // Middleware para configurar o token em cada requisição
    setupToken: (req, res, next) => {
        // Obter token do cookie ou header
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        
        if (accessToken) {
            // Configurar token no serviço
            whatsappService.setAuthToken(accessToken);
        }
        
        next();
    },
    
    /**
     * Retorna a imagem do QR Code para autenticação
     */
    getQRCode: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            // Obter sessionId da query (que será o ID da escola)
            const { sessionId } = req.query;
            
            if (!sessionId) {
                logger.warn('Tentativa de obter QR Code sem especificar ID da escola');
            }
            
            const qrStream = await whatsappService.getQRCodeStream(sessionId, accessToken);
            
            if (qrStream) {
                // Define os headers para a imagem
                res.setHeader('Content-Type', 'image/png');
                // Encaminha o stream da imagem
                qrStream.pipe(res);
            } else {
                res.status(404).send('QR Code não disponível');
            }
        } catch (error) {
            logger.error(`Erro ao obter QR code: ${error.message}`);
            res.status(500).send('Erro ao gerar QR Code');
        }
    },

    /**
     * Retorna a página de conexão com o WhatsApp
     */
    getConnectPage: async (req, res) => {
        try {
            // Obter o ID da escola da query
            const { sessionId } = req.query;
            
            // Opção 1: Buscar HTML do microserviço e renderizar
            const html = await whatsappService.getConnectPageHTML(sessionId);
            res.send(html);
            
            // Opção 2: Renderizar template local
            /*res.render('whatsapp/connect', {
                title: 'Conectar WhatsApp',
                user: req.user,
                sessionId: sessionId
            });*/
        } catch (error) {
            logger.error(`Erro ao obter página de conexão: ${error.message}`);
            res.status(500).send('Erro ao carregar página de conexão');
        }
    },

    /**
     * Verifica o status da conexão com o WhatsApp
     */
    getStatus: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            // Obter sessionId da query (que será o ID da escola)
            const { sessionId } = req.query;
            
            if (!sessionId) {
                logger.warn('Tentativa de verificar status sem especificar ID da escola');
            }
            
            const status = await whatsappService.getConnectionStatus(sessionId, accessToken);
            res.json(status);
        } catch (error) {
            logger.error(`Erro ao verificar status: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro ao verificar status da conexão',
                error: error.message
            });
        }
    },

    /**
     * Desconecta o WhatsApp
     */
    disconnect: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            // Obter sessionId do body (que será o ID da escola)
            const { sessionId } = req.body;
            
            if (!sessionId) {
                logger.warn('Tentativa de desconectar sem especificar ID da escola');
                return res.status(400).json({
                    success: false,
                    message: 'ID da escola é obrigatório'
                });
            }
            
            const result = await whatsappService.disconnect(sessionId, accessToken);
            res.json(result);
        } catch (error) {
            logger.error(`Erro ao desconectar: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro ao desconectar WhatsApp',
                error: error.message
            });
        }
    },

    /**
     * Envia uma mensagem via WhatsApp
     */
    sendMessage: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            logger.info('Recebendo requisição para enviar mensagem WhatsApp');
            logger.debug('Headers da requisição:', req.headers);
            logger.debug('Corpo da requisição:', req.body);
            
            if (!req.body) {
                return res.status(400).json({
                    success: false,
                    message: 'Corpo da requisição vazio ou malformado'
                });
            }
            
            const { phone, message, sessionId } = req.body;
            
            if (!phone || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Número de telefone e mensagem são obrigatórios'
                });
            }
            
            // Informações do usuário para logar quem enviou a mensagem
            const userId = req.user?.id || req.body.userId;
            const userName = req.user?.name || req.body.userName;
            
            // Passo o usuário para logar quem enviou a mensagem
            const result = await whatsappService.sendMessage(
                phone, 
                message, 
                {
                    sessionId,
                    userId,
                    userName
                },
                accessToken
            );
            
            res.json(result);
        } catch (error) {
            logger.error(`Erro ao enviar mensagem: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro ao enviar mensagem',
                error: error.message
            });
        }
    },

    /**
     * Lista as mensagens enviadas/recebidas
     */
    getMessages: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            const { limit, offset, phone, startDate, endDate, type, sessionId } = req.query;
            
            const messages = await whatsappService.getMessages({
                limit: parseInt(limit) || 10,
                offset: parseInt(offset) || 0,
                phone,
                startDate,
                endDate,
                type
            }, sessionId, accessToken);
            
            res.json({
                success: true,
                messages
            });
        } catch (error) {
            logger.error(`Erro ao listar mensagens: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro ao listar mensagens',
                error: error.message
            });
        }
    },

    /**
     * Verifica o status do serviço de mensagens
     */
    getServiceStatus: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            const { sessionId } = req.query;
            
            const status = await whatsappService.getServiceStatus(sessionId, accessToken);
            res.json(status);
        } catch (error) {
            logger.error(`Erro ao verificar status do serviço: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro ao verificar status do serviço',
                error: error.message
            });
        }
    },

    getMessageStatus: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            // Obter messageId dos parâmetros da URL
            const { messageId } = req.params;
            
            if (!messageId) {
                logger.warn('Tentativa de verificar status de mensagem sem especificar ID');
                return res.status(400).json({
                    success: false,
                    message: 'ID da mensagem é obrigatório'
                });
            }
            
            // Obter sessionId da query (que será o ID da escola)
            const { sessionId } = req.query;
            
            // Verificar status da mensagem
            logger.info(`Verificando status da mensagem: ${messageId}, sessão: ${sessionId || 'não informada'}`);
            const status = await whatsappService.getMessageStatus(messageId, sessionId, accessToken);
            
            res.json(status);
        } catch (error) {
            logger.error(`Erro ao verificar status da mensagem: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro ao verificar status da mensagem',
                error: error.message
            });
        }
    },

    /**
     * Renderiza o painel de administração do WhatsApp
     */
    renderAdminPanel: (req, res) => {
        // Obter o ID da escola da query
        const { schoolId } = req.query;
        
        res.render('admin/whatsapp', {
            title: 'Administração de WhatsApp',
            user: req.user,
            currentPage: 'whatsapp',
            schoolId: schoolId // Passar o ID da escola para a view
        });
    },
    
    /**
     * Reinicia uma sessão do WhatsApp
     */
    resetSession: async (req, res) => {
        try {
            // Obter o token da requisição
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            
            const { sessionId } = req.body;
            
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID da escola é obrigatório'
                });
            }
            
            const result = await whatsappService.resetSession(sessionId, accessToken);
            
            res.json(result);
        } catch (error) {
            logger.error(`Erro ao reiniciar sessão: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro ao reiniciar sessão do WhatsApp',
                error: error.message
            });
        }
    }
};

module.exports = whatsappController;