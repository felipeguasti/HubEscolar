const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middlewares/auth');

// Rota para filtrar usuários por district e school
router.get('/filter', authMiddleware(), usersController.filterUsers); // Usando a função filterUsers no controlador existente
// Rotas para atualizar e deletar usuários
router.put('/edit/:id', usersController.atualizarUsuario);
// Rota para buscar um usuário específico pelo ID
router.get('/:id', usersController.buscarUsuario);
router.delete('/delete/:id', usersController.deletarUsuario);
// Rota para adicionar um novo usuário
router.post('/', usersController.adicionarUsuario);
// Rota para listar todos os usuários
router.get('/', usersController.listarUsuarios);
// Rota para resetar a senha
router.post('/reset-password', usersController.resetarSenha);
router.get('/me', usersController.buscarUsuarioLogado);

module.exports = router;
