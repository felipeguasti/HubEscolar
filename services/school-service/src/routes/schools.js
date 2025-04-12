const express = require("express");
const router = express.Router();
const schoolController = require("../controllers/schoolController");
const authMiddleware = require('../middlewares/auth');

// Rota para criar uma nova escola
router.post("/create", authMiddleware, schoolController.createSchool);

// Rota para listar todas as escolas (protegida)
router.get("/list", authMiddleware, schoolController.getSchools);

// Rota para obter uma escola específica pelo ID (protegida)
router.get("/:id", authMiddleware, schoolController.getSchoolById);

// Rota para atualizar uma escola pelo ID (protegida)
router.put("/:id", authMiddleware, schoolController.updateSchool);

// Rota para excluir uma escola pelo ID (protegida)
router.delete("/delete/:id", authMiddleware, schoolController.deleteSchool);

module.exports = router;