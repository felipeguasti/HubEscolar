const express = require("express");
const router = express.Router();
const schoolController = require("../controllers/schoolController");
const authMiddleware = require('../middlewares/auth');

// Rota para Renderizar página todos os Escolas
router.get("/", authMiddleware(), schoolController.renderSchoolPage);

// Rota para criar um novo Escolas (apenas usuário Master pode criar)
router.post("/create", authMiddleware(["Master", "Inspetor"]), schoolController.createSchool);

// Rota para listar todos os Escolas
router.get("/list", authMiddleware(), schoolController.getAllSchool);

// Rota para obter um Escolas específico pelo ID
router.get("/:id", authMiddleware(), schoolController.getSchoolById);

// Rota para atualizar um Escolas pelo ID (apenas usuário Master pode atualizar)
router.put("/edit/:id", authMiddleware(["Master", "Inspetor"]), schoolController.updateSchool);

// Rota para excluir um Escolas pelo ID (apenas usuário Master pode excluir)
router.delete("/delete/:id", authMiddleware(["Master", "Inspetor"]), schoolController.deleteSchool);

module.exports = router;
