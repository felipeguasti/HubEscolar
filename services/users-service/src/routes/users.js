const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const cacheUserMiddleware = require('../middlewares/cacheUser');
const usersController = require('../controllers/usersController');

router.post('/users', authenticate, cacheUserMiddleware, usersController.adicionarUsuario);
router.get('/users', authenticate, cacheUserMiddleware, usersController.listarUsuarios);
router.put('/users/:id', authenticate, cacheUserMiddleware, usersController.atualizarUsuario);
router.delete('/users/:id', authenticate, cacheUserMiddleware, usersController.deletarUsuario);
router.get('/users/me', authenticate, cacheUserMiddleware, usersController.buscarUsuarioLogado);
router.get('/users/:id', authenticate, cacheUserMiddleware, usersController.buscarUsuario);
router.get('/filter', authenticate, cacheUserMiddleware, usersController.filterUsers);
router.post('/users/reset-password', authenticate, cacheUserMiddleware, usersController.resetarSenha);
router.get('/users/data', authenticate, cacheUserMiddleware, usersController.getUsersData);

module.exports = router;