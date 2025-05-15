const express = require("express");
const router = express.Router();
const gradeController = require("../controllers/gradeController");
const authMiddleware = require('../middlewares/auth');
const {validate, createGrade, updateGrade} = require('../validations/gradeValidate');

// Middleware de autenticação aplicado a todas as rotas
router.use(authMiddleware);

// Rotas de consulta
router.get("/list", gradeController.getAllGrades);
router.get("/school/:schoolId", gradeController.getGradesBySchool);
router.get("/district/:districtId", gradeController.getGradesByDistrict);
router.get("/:id", gradeController.getGradeById);

// Rotas de modificação (com validação)
router.post("/create", 
    validate(createGrade),
    gradeController.createGrade
);

router.put("/edit/:id", 
    validate(updateGrade), 
    gradeController.updateGrade
);

router.delete("/delete/:id", gradeController.deleteGrade);

// Rotas de status
router.patch("/:id/status", 
    validate(createGrade.updateStatus),
    gradeController.updateStatus
);

module.exports = router;