const express = require('express');
const router = express.Router();
const gradeService = require('../services/gradeService');
const districtService = require('../services/districtService');
const schoolService = require('../services/schoolService');
const isAuthenticated = require('../middlewares/auth'); 
const requireRole = require('../middlewares/requireRole');


router.use(isAuthenticated);
router.get("/", async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const { schoolId, districtId } = req.query;
        const role = req.user ? req.user.role : null;
        
        // Get districts first
        const districtResponse = await districtService.getAllDistricts(accessToken, 1, 0);
        const districts = districtResponse.data || [];
        
        // Get ALL schools without filter initially
        const schools = await schoolService.getAllSchools(accessToken);
        // Important: schools is already the array, no need for .data
        const schoolsData = Array.isArray(schools) ? schools : [];
        
        // Create lookup maps
        const districtMap = new Map(districts.map(d => [d.id, d.name]));
        const schoolMap = new Map(schoolsData.map(s => [s.id, s.name]));
        
        // Get grades with filters
        let gradeResponse;
        if (schoolId) {
            gradeResponse = await gradeService.getGradesBySchool(accessToken, schoolId);
        } else if (districtId || req.user?.districtId) {
            gradeResponse = await gradeService.getGradesByDistrict(accessToken, districtId || req.user.districtId);
        } else {
            gradeResponse = await gradeService.getAllGrades(accessToken);
        }

        // Debug each grade enrichment with more detail
        const enrichedGrades = gradeResponse.data.map(grade => {
            const schoolFound = schoolMap.get(grade.schoolId);
            
            return {
                ...grade,
                schoolName: schoolMap.get(grade.schoolId) || 'Escola não encontrada',
                districtName: districtMap.get(grade.districtId) || 'Distrito não encontrado'
            };
        });

        res.render("grades", {
            title: "Turmas",
            districts,
            schools: schoolsData,
            grades: enrichedGrades,
            role,
            user: req.user,
            districtId: districtId || (req.user ? req.user.districtId : null),
            schoolId: schoolId || (req.user ? req.user.schoolId : null),
        });
    } catch (err) {
        console.error("Erro ao buscar dados para a página de turmas:", err);
        res.status(500).send("Erro ao carregar a página de turmas.");
    }
});

// Rota para listar todas as turmas (dados JSON)
router.get("/list", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    const schoolId = req.query.schoolId;
    try {
        const result = await gradeService.getAllGrades(accessToken, schoolId);
        res.json(result);  // Changed from result.data to result
    } catch (error) {
        console.error("Erro ao listar turmas:", error.response?.data || error.message);
        next(error);
    }
});

// Rota para criar uma nova turma
router.post("/create", requireRole(["Master", "Inspetor", "Diretor", "Secretario"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const result = await gradeService.createGrade(accessToken, req.body);
        res.status(201).json(result);  // Changed from result.data to result
    } catch (error) {
        console.error("Erro ao criar turma:", error.response?.data || error.message);
        if (error.response?.status === 400) {
            return res.status(400).json(error.response.data);
        }
        next(error);
    }
});

// Rota para obter uma turma específica pelo ID
router.get("/:id", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const result = await gradeService.getGradeById(accessToken, req.params.id);
        res.json(result);  // Changed from conditional check to direct return
    } catch (error) {
        console.error("Erro ao buscar turma:", error.response?.data || error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'Turma não encontrada' });
        }
        next(error);
    }
});

// Rota para atualizar uma turma pelo ID (apenas usuários com as roles especificadas podem atualizar)
router.put("/edit/:id", requireRole(["Master", "Inspetor", "Diretor", "Secretario"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const result = await gradeService.updateGrade(accessToken, req.params.id, req.body);
        // Return the complete result from microservice
        res.json(result);
    } catch (error) {
        console.error("Erro ao atualizar turma:", error.response?.data || error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'Turma não encontrada' });
        }
        if (error.response?.status === 400) {
            return res.status(400).json(error.response.data);
        }
        next(error);
    }
});

// Rota para excluir uma turma pelo ID (apenas usuários com as roles especificadas podem excluir)
router.delete("/delete/:id", requireRole(["Master", "Inspetor", "Diretor", "Secretario"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const result = await gradeService.deleteGrade(req.params.id, accessToken);
        res.json(result);  // Added response
    } catch (error) {
        console.error("Erro ao excluir turma:", error.response?.data || error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'Turma não encontrada' });
        }
        next(error);
    }
});

// Rota para buscar turmas por escola
router.get("/school/:schoolId", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const result = await gradeService.getGradesBySchool(accessToken, req.params.schoolId);
        res.json(result);
    } catch (error) {
        console.error("Erro ao buscar turmas da escola:", error.response?.data || error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'Nenhuma turma encontrada para esta escola' });
        }
        next(error);
    }
});

// Rota para buscar turmas por distrito
router.get("/district/:districtId", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const result = await gradeService.getGradesByDistrict(accessToken, req.params.districtId);
        res.json(result);
    } catch (error) {
        console.error("Erro ao buscar turmas do distrito:", error.response?.data || error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'Nenhuma turma encontrada para este distrito' });
        }
        next(error);
    }
});

module.exports = router;