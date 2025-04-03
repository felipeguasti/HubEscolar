const express = require("express");
const router = express.Router();
const gradeController = require("../controllers/gradeController");
const authMiddleware = require('../middlewares/auth');


// Rota para listar todos as turmas
router.get("/", authMiddleware(), gradeController.getAllGrades);

// Rota para listar todos as turmas
router.get("/", authMiddleware(), gradeController.renderGradesPage);

// Rota para criar um novo turmas
router.post("/create", authMiddleware(["Master", "Inspetor", "Secretario"]), gradeController.createGrade);

// Rota para obter um distrito específico pelo ID
router.get("/:id", authMiddleware(), gradeController.getGradeById);

// Rota para atualizar um turma pelo ID (apenas usuário Master pode atualizar)
router.put("/edit/:id", authMiddleware(["Master", "Inspetor", "Secretario"]), gradeController.updateGrade);

// Rota para excluir um turma pelo ID (apenas usuário Master pode excluir)
router.delete("/delete/:id", authMiddleware(["Master", "Inspetor", "Secretario"]), gradeController.deleteGrade);

module.exports = router;
