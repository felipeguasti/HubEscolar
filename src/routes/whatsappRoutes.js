const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const isAuthenticated = require('../middlewares/auth'); // Importação correta
const { checkRole } = require('../middlewares/roleHandler');

// Adicionar middleware para configurar token em todas as requisições
router.use(whatsappController.setupToken);

// ========== ROTAS PÚBLICAS (QR CODE E PÁGINA DE CONEXÃO) ==========

// Rota para visualizar o QR Code
router.get('/auth/qrcode', whatsappController.getQRCode);

// Rota para página de conexão com o WhatsApp
router.get('/auth/connect', whatsappController.getConnectPage);

// ========== ROTAS PROTEGIDAS (REQUEREM AUTENTICAÇÃO) ==========

// Middleware de autenticação para as rotas protegidas
router.use(isAuthenticated);

// Verificar status da conexão
router.get('/auth/status', whatsappController.getStatus);

// Desconectar WhatsApp
router.post('/auth/disconnect', whatsappController.disconnect);

// Reiniciar sessão WhatsApp (nova rota)
router.post('/auth/reset', whatsappController.resetSession);

// Enviar mensagem
router.post('/messages/send', whatsappController.sendMessage);

// Listar mensagens
router.get('/messages', whatsappController.getMessages);

// Verificar status do serviço de mensagens
router.get('/messages/status', whatsappController.getServiceStatus);
router.get('/messages/status/:messageId', whatsappController.getMessageStatus);

// Para a rota de admin, verificamos a role manualmente
router.get('/admin', isAuthenticated, checkRole(['Admin', 'Diretor']), whatsappController.renderAdminPanel);

module.exports = router;