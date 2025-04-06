const express = require('express');
const router = express.Router();
const { login, refreshToken } = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const { body, param } = require('express-validator');
const validationResultHandler = require('../middlewares/validationResultHandler');
const { loginLimiter } = require('../middlewares/rateLimitMiddleware'); // Importe do middleware

// Validações para login
const loginValidation = [
    body('email').isEmail().withMessage('E-mail inválido.'),
    body('password').notEmpty().withMessage('A senha é obrigatória.'),
];

// Validações para refresh token
const refreshTokenValidation = [
    body('refreshToken').notEmpty().withMessage('O refresh token é obrigatório.'),
];

// Rota para login (agora com rate limiter e validações)
router.post('/login', loginLimiter, loginValidation, validationResultHandler, login);

// Nova rota para obter um novo token de acesso usando um refresh token
router.post('/refresh-token', refreshTokenValidation, validationResultHandler, refreshToken);

// Rota para validar um token existente
router.post('/validate-token', authMiddleware, (req, res) => {
    console.log('Requisição recebida para validar token');
    return res.status(200).json({ valid: true, userId: req.user ? req.user.id : null });
});

// Rota para verificar a autenticação (similar a validate-token)
router.get('/verify', authMiddleware, (req, res) => {
    return res.status(200).json({ authenticated: true, userId: req.user ? req.user.id : null });
});

// Rota para solicitar a redefinição de senha
router.post('/request-password-reset', [
    body('email').isEmail().withMessage('E-mail inválido.')
], validationResultHandler, (req, res) => {
    // Lógica para solicitar a redefinição de senha (interagirá com users-service)
    return res.status(200).json({ message: 'Solicitação de redefinição de senha recebida.' });
});

// Rota para redefinir a senha
router.post('/reset-password/:token', [
    param('token').notEmpty().withMessage('O token é obrigatório.'),
    body('password').isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres.')
], validationResultHandler, (req, res) => {
    // Lógica para redefinir a senha (interagirá com users-service)
    return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
});

module.exports = router;