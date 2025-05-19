const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota pública para exibir o QR Code - não requer autenticação
router.get('/qrcode', authController.getQRCode);

// Página HTML com instruções para conectar
router.get('/connect', authController.getConnectPage);

// Rota para verificar o status da conexão
router.get('/status', authController.getStatus);

// Rota para desconectar WhatsApp
router.post('/disconnect', authController.disconnect);

// Rota para listar todas as sessões ativas
router.get('/sessions', authController.getAllSessions);

module.exports = router;