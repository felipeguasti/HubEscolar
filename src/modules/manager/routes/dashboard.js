const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middlewares/auth');
const User = require('../../../models/User'); 

// Rota de lobby após login
router.get('/', authMiddleware(), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id); // Utilizando findByPk com a chave primária

        if (!user) {
            return res.status(404).send('Usuário não encontrado');
        }

        // Envia o usuário e o role para a view
        res.render('dashboard', {
            title: 'Dashboard',
            user: user // Passa o usuário com todas as informações, incluindo role
        });
    } catch (err) {
        console.error('Erro ao carregar usuário:', err);
        res.status(500).send('Erro no servidor');
    }
});


module.exports = router;
