const express = require('express');
console.log('Auth routes loaded'); // Adicione isso logo após o require do express
const router = express.Router();
const { login, register, logout, verifyAuth, checkNameAndEmailExistence, requestPasswordReset, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authorization');

// Rota para acessar a página de registro
router.get('/register', (req, res) => {
    res.render('register', {
        title: 'Cadastro'
    });
});

router.post('/login', login);
router.post('/register', register);
router.post('/check-name-email', checkNameAndEmailExistence);
router.post('/logout', logout);
router.get('/verify', authMiddleware(), verifyAuth);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
