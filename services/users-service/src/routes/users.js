const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const cacheUserMiddleware = require('../middlewares/cacheUser');
const usersController = require('../controllers/usersController');

router.post('/create', authenticate, cacheUserMiddleware, usersController.adicionarUsuario);
router.get('/list/:id', authenticate, cacheUserMiddleware, usersController.buscarUsuario);
router.get('/list', authenticate, cacheUserMiddleware, usersController.listarUsuarios);
router.put('/edit/:id', authenticate, cacheUserMiddleware, usersController.atualizarUsuario);
router.delete('/delete/:id', authenticate, cacheUserMiddleware, usersController.deletarUsuario);
router.get('/me', cacheUserMiddleware, usersController.buscarUsuarioLogado);
router.get('/email/:email', cacheUserMiddleware, usersController.buscarUsuarioPorEmail);
router.get('/filter', authenticate, cacheUserMiddleware, usersController.filterUsers);
router.post('/reset-password', authenticate, cacheUserMiddleware, usersController.resetarSenha);
router.get('/data', authenticate, cacheUserMiddleware, usersController.getUsersData);

module.exports = router;