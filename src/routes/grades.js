const express = require("express");
const router = express.Router();
const gradeController = require("../controllers/gradeController");
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole'); // Certifique-se de importar o requireRole

// Rota para renderizar a página de turmas
router.get("/", authMiddleware, async (req, res, next) => {
    try {
        await gradeController.renderGradesPage(req, res);
    } catch (error) {
        next(error);
    }
});

// Rota para listar todas as turmas (dados JSON)
router.get("/grades", authMiddleware, async (req, res, next) => {
    try {
        await gradeController.getAllGrades(req, res);
    } catch (error) {
        next(error);
    }
});

// Rota para criar uma nova turma
router.post("/create", authMiddleware, requireRole(["Master", "Inspetor", "Secretario"]), async (req, res, next) => {
    try {
        await gradeController.createGrade(req, res);
    } catch (error) {
        next(error);
    }
});

// Rota para obter uma turma específica pelo ID
router.get("/:id", authMiddleware, async (req, res, next) => {
    try {
        await gradeController.getGradeById(req, res);
    } catch (error) {
        next(error);
    }
});

// Rota para atualizar uma turma pelo ID (apenas usuários com as roles especificadas podem atualizar)
router.put("/edit/:id", authMiddleware, requireRole(["Master", "Inspetor", "Secretario"]), async (req, res, next) => {
    try {
        await gradeController.updateGrade(req, res);
    } catch (error) {
        next(error);
    }
});

// Rota para excluir uma turma pelo ID (apenas usuários com as roles especificadas podem excluir)
router.delete("/delete/:id", authMiddleware, requireRole(["Master", "Inspetor", "Secretario"]), async (req, res, next) => {
    try {
        await gradeController.deleteGrade(req, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;