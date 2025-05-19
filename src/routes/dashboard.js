const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const usersService = require('../services/usersService');

// Rota de lobby após login
router.get('/', authMiddleware, async (req, res) => {
    try {
        // O token já foi verificado pelo authMiddleware
        const accessToken = req.cookies.accessToken;

        console.log('ID do usuário autenticado:', req.user.id);
        
        // Buscar os detalhes completos do usuário
        const user = await usersService.getUserById(req.user.id, accessToken);

        if (!user) {
            console.error('Usuário não encontrado no serviço de usuários');
            return res.status(404).send('Usuário não encontrado');
        }

        // Log para verificar se o schoolId está sendo retornado pelo serviço
        console.log('Dados do usuário recebidos do serviço:', {
            id: user.id,
            role: user.role,
            schoolId: user.schoolId,
            name: user.name
        });

        // Se o usuário não tiver schoolId e não for admin, podemos tentar buscar
        if (!user.schoolId && !['Master', 'Inspetor'].includes(user.role)) {
            console.warn(`Usuário ${user.id} não tem schoolId definido`);
        }

        // Definir currentPage para navegação ativa
        res.render('dashboard', {
            title: 'Dashboard',
            user: user,
            currentPage: 'dashboard'
        });
    } catch (err) {
        console.error('Erro ao carregar usuário via users-service:', err);
        console.error('Detalhes do erro:', err.response?.data || err.message);
        res.status(500).send('Erro no servidor ao buscar informações do usuário');
    }
});

module.exports = router;