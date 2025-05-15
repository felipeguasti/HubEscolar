const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middlewares/auth'); // Importa a função middleware diretamente
const adminController = require('../controllers/adminsController');

router.get('/', isAuthenticated, (req, res) => {
    res.send('Rota de administradores funcionando!');
});

router.get('/schools', isAuthenticated, async (req, res, next) => {
    try {
        await adminController.renderSchoolPage(req, res);
    } catch (error) {
        next(error);
    }
});

router.get('/tools', isAuthenticated, async (req, res, next) => {
    try {
        await adminController.renderToolsPage(req, res);
    } catch (error) {
        next(error);
    }
});

router.get('/tools/management', isAuthenticated, async (req, res, next) => {
    try {
        await adminController.renderToolsManagementPage(req, res);
    } catch (error) {
        next(error);
    }
});

router.get('/sales', isAuthenticated, async (req, res, next) => {
    try {
        await adminController.renderSalesPage(req, res);
    } catch (error) {
        next(error);
    }
});

router.get('/settings', isAuthenticated, async (req, res, next) => {
    try {
        await adminController.renderSettingsPage(req, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;