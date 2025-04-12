const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middlewares/auth'); // Importa a função middleware diretamente
const adminController = require('../controllers/adminsController');

router.get('/', isAuthenticated, (req, res) => {
    res.send('Rota de administradores funcionando!');
});

router.get('/users', isAuthenticated, async (req, res, next) => {
    try {
        await adminController.renderUsersPage(req, res);
    } catch (error) {
        next(error);
    }
});

router.get('/schools', isAuthenticated, async (req, res, next) => {
    try {
        await adminController.renderSchoolPage(req, res);
    } catch (error) {
        next(error);
    }
});


module.exports = router;