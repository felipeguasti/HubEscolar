const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { validateMessage } = require('../middlewares/validation');
const auth = require('../middlewares/auth');

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas específicas
router.post('/send', validateMessage, messageController.sendMessage);
router.get('/', messageController.getMessages);
router.get('/status', messageController.getStatus);
router.get('/status/:messageId', messageController.getMessageStatus);
router.post('/status/batch', messageController.getBatchMessageStatus);

module.exports = router;