const express = require('express');
const syncController = require('../controllers/syncController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * @swagger
 * /sync/status:
 *   get:
 *     summary: Verifica a disponibilidade do serviço SEGES
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status do serviço SEGES
 */
router.get('/status', syncController.verificarStatusSEGES);

/**
 * @swagger
 * /sync/schools/{schoolId}/metrics:
 *   get:
 *     summary: Obtém métricas de sincronização da escola
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da escola
 *     responses:
 *       200:
 *         description: Métricas de sincronização
 */
router.get('/schools/:schoolId/metrics', syncController.getMetricas);

/**
 * @swagger
 * /sync/schools/{schoolId}/import/classes:
 *   post:
 *     summary: Importa turmas do SEGES para a escola
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da escola
 *     responses:
 *       200:
 *         description: Turmas importadas com sucesso
 */
router.post('/schools/:schoolId/import/classes', syncController.importTurmas);

/**
 * @swagger
 * /sync/schools/{schoolId}/import/students:
 *   post:
 *     summary: Importa alunos do SEGES para a escola
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da escola
 *     responses:
 *       200:
 *         description: Alunos importados com sucesso
 */
router.post('/schools/:schoolId/import/students', syncController.importAlunos);

/**
 * @swagger
 * /sync/schools/{schoolId}/import/all:
 *   post:
 *     summary: Importa turmas e alunos do SEGES para a escola
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da escola
 *     responses:
 *       200:
 *         description: Turmas e alunos importados com sucesso
 */
router.post('/schools/:schoolId/import/all', syncController.importTurmasEAlunos);

module.exports = router;