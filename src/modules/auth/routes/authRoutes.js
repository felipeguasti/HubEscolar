const express = require('express');
const router = express.Router();
const { login, register, logout, verifyAuth, checkNameAndEmailExistence, requestPasswordReset, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../../../middlewares/auth');

router.get('/register', (req, res) => {
    res.render('register', {
        title: 'Cadastro'
    });
});

router.post('/validate-token', authMiddleware(), (req, res) => {
    console.log('Requisição recebida para validar token');
    return res.status(200).json({ valid: true });
});

router.post('/login', login);
router.post('/register', register);
router.post('/check-name-email', checkNameAndEmailExistence);
router.post('/logout', logout);
router.get('/verify', authMiddleware(), verifyAuth);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;
