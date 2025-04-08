const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const usersService = require('../services/usersService'); // Certifique-se de que este caminho está correto

// Rota de lobby após login
router.get('/', authMiddleware, async (req, res) => {
    try {
        // O token já foi verificado pelo authMiddleware
        // O ID do usuário autenticado está disponível em req.user.id

        // O accessToken está disponível em req.cookies.accessToken
        const accessToken = req.cookies.accessToken;

        const user = await usersService.getUserById(req.user.id, accessToken);

        if (!user) {
            return res.status(404).send('Usuário não encontrado');
        }

        // Envia o usuário e o role para a view
        res.render('dashboard', {
            title: 'Dashboard',
            user: user
        });
    } catch (err) {
        console.error('Erro ao carregar usuário via users-service:', err);
        res.status(500).send('Erro no servidor ao buscar informações do usuário');
    }
});

module.exports = router;