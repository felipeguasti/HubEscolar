const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const adminController = require('../controllers/adminsController');

router.get('/', authMiddleware(), (req, res) => {
    res.send('Rota de administradores funcionando!');
});
router.get('/users', authMiddleware(), adminController.renderUsersPage);

module.exports = router;
