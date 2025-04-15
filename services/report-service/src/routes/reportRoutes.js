// src/routes/reportRoutes.js
const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Rota protegida para criar um relatório com IA
router.post('/create', authMiddleware, reportController.createReport);

// Rota protegida para criar um relatório MANUAL
router.post('/create/manual', authMiddleware, reportController.createManualReport);

module.exports = router;