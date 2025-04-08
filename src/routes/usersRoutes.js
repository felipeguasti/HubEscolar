const express = require('express');
const router = express.Router();
const usersService = require('../services/usersService'); // Importa o módulo para comunicar com o users-service
const isAuthenticated = require('../middlewares/auth'); // Middleware de autenticação no sistema principal

// Rota para adicionar um usuário (chama o users-service)
router.post('/users', isAuthenticated, async (req, res) => {
    try {
        const newUser = await usersService.createUser(req.body, req.headers.authorization?.split(' ')[1]);
        return res.status(201).json(newUser);
    } catch (error) {
        console.error('Erro ao adicionar usuário:', error);
        return res.status(500).json({ message: 'Erro ao adicionar usuário', error: error.message });
    }
});

// Rota para listar usuários (chama o users-service)
router.get('/users', isAuthenticated, async (req, res) => {
    try {
        const users = await usersService.getAllUsers(req.headers.authorization?.split(' ')[1]);
        return res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        return res.status(500).json({ message: 'Erro ao listar usuários', error: error.message });
    }
});

// Rota para atualizar um usuário por ID (chama o users-service)
router.put('/users/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        const updatedUser = await usersService.updateUser(id, req.body, req.headers.authorization?.split(' ')[1]);
        return res.json(updatedUser);
    } catch (error) {
        console.error(`Erro ao atualizar usuário com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
    }
});

// Rota para deletar um usuário por ID (chama o users-service)
router.delete('/users/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await usersService.deleteUser(id, req.headers.authorization?.split(' ')[1]);
        return res.status(204).send(); // No content
    } catch (error) {
        console.error(`Erro ao deletar usuário com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao deletar usuário', error: error.message });
    }
});

// Rota para buscar o usuário logado (chama o users-service)
router.get('/users/me', isAuthenticated, async (req, res) => {
    try {
        // Assumindo que o middleware isAuthenticated injeta req.user com informações do usuário logado
        const loggedInUser = await usersService.getUserById(req.user.id, req.headers.authorization?.split(' ')[1]);
        if (loggedInUser) {
            return res.json(loggedInUser);
        } else {
            return res.status(404).json({ message: 'Usuário logado não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar usuário logado:', error);
        return res.status(500).json({ message: 'Erro ao buscar usuário logado', error: error.message });
    }
});

// Rota para buscar um usuário por ID (chama o users-service)
router.get('/users/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await usersService.getUserById(id, req.headers.authorization?.split(' ')[1]);
        if (user) {
            return res.json(user);
        } else {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error(`Erro ao buscar usuário com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
    }
});

// Rota para filtrar usuários (chama o users-service)
router.get('/filter', isAuthenticated, async (req, res) => {
    try {
        const filteredUsers = await usersService.filterUsers(req.query, req.headers.authorization?.split(' ')[1]);
        return res.json(filteredUsers);
    } catch (error) {
        console.error('Erro ao filtrar usuários:', error);
        return res.status(500).json({ message: 'Erro ao filtrar usuários', error: error.message });
    }
});

// Rota para resetar a senha de um usuário (chama o users-service)
router.post('/users/reset-password', isAuthenticated, async (req, res) => {
    try {
        const result = await usersService.resetPassword(req.body.userId, req.body.newPassword, req.headers.authorization?.split(' ')[1]);
        return res.json(result);
    } catch (error) {
        console.error('Erro ao resetar senha do usuário:', error);
        return res.status(500).json({ message: 'Erro ao resetar senha do usuário', error: error.message });
    }
});

// Rota para obter dados de usuários (chama o users-service)
router.get('/users/data', isAuthenticated, async (req, res) => {
    try {
        const usersData = await usersService.getUsersData(req.headers.authorization?.split(' ')[1]);
        return res.json(usersData);
    } catch (error) {
        console.error('Erro ao obter dados de usuários:', error);
        return res.status(500).json({ message: 'Erro ao obter dados de usuários', error: error.message });
    }
});

module.exports = router;