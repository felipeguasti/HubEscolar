const express = require("express");
const router = express.Router();
const gradeController = require("../controllers/gradeController");
const authMiddleware = require('../middlewares/auth');

// Rota para listar todas as turmas (dados JSON)
router.get("/list", authMiddleware, gradeController.getAllGrades);

// Rota para criar uma nova turma
router.post("/create", authMiddleware, gradeController.createGrade);

// Rota para obter uma turma específica pelo ID
router.get("/:id", authMiddleware, gradeController.getGradeById);

// Rota para atualizar uma turma pelo ID (apenas usuários com as roles especificadas podem atualizar)
router.put("/edit/:id", authMiddleware, gradeController.updateGrade);

// Rota para excluir uma turma pelo ID (apenas usuários com as roles especificadas podem excluir)
router.delete("/delete/:id", authMiddleware, gradeController.deleteGrade);

module.exports = router;