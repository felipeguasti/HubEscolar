import express from 'express';
import { body, param } from 'express-validator';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { validationResultHandler } from '../middlewares/validationResultHandler.js';
import { loginLimiter, apiLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Validações para login
const loginValidation = [
    body('email').isEmail().withMessage('E-mail inválido.'),
    body('password').notEmpty().withMessage('A senha é obrigatória.'),
];

// Validações para refresh token
const refreshTokenValidation = [
    body('refreshToken').notEmpty().withMessage('O refresh token é obrigatória.'),
];

// Rota para login (com rate limiter específico para login)
router.post('/login', loginLimiter, loginValidation, validationResultHandler, authController.login);

// Nova rota para obter um novo token de acesso usando um refresh token
router.post('/refresh-token', refreshTokenValidation, validationResultHandler, authController.refreshToken);

// Rota para validar um token existente
router.post('/validate-token', [
    body('accessToken').notEmpty().withMessage('O access token é obrigatório.')
], validationResultHandler, authMiddleware, apiLimiter, (req, res) => {
    return res.status(200).json({ valid: true, userId: req.user ? req.user.id : null });
});

// Rota para verificar a autenticação (similar a validate-token)
router.get('/verify', authMiddleware, apiLimiter, (req, res) => {
    return res.status(200).json({ authenticated: true, userId: req.user ? req.user.id : null });
});

// Rota para solicitar a redefinição de senha
router.post('/request-password-reset', [
    body('email').isEmail().withMessage('E-mail inválido.')
], validationResultHandler, apiLimiter, (req, res) => {
    // Lógica para solicitar a redefinição de senha (interagirá com users-service)
    return res.status(200).json({ message: 'Solicitação de redefinição de senha recebida.' });
});

// Rota para redefinir a senha
router.post('/reset-password/:token', [
    param('token').notEmpty().withMessage('O token é obrigatório.'),
    body('password').isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres.')
], validationResultHandler, apiLimiter, (req, res) => {
    // Lógica para redefinir a senha (interagirá com users-service)
    return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
});

export default router;