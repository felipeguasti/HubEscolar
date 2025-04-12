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
        const districtResponse = await districtService.getAllDistricts(accessToken, 1, 0);
        const schoolResponse = await schoolService.getAllSchools(accessToken);
        const gradeResponse = await gradeService.getAllGrades(accessToken, req.query.schoolId);

        const districts = districtResponse.data || [];
        const schools = schoolResponse;
        const grades = gradeResponse.results || gradeResponse;
        const role = req.user ? req.user.role : null;

        // Criar um dicionário de distritos
        const districtMap = {};
        districts.forEach(district => {
            districtMap[district.id] = district.name;
        });

        // Criar um dicionário de escolas e associá-las ao distrito
        const schoolMap = {};
        schools.forEach(school => {
            schoolMap[school.id] = {
                name: school.name,
                districtId: school.districtId,
            };
        });

        // Filtrando as escolas de acordo com o districtId do Inspetor
        let filteredSchools = schools;
        if (req.user && req.user.districtId) {
            filteredSchools = schools.filter(school => school.districtId === req.user.districtId);
        }

        const gradesWithNames = grades.map(grade => {
            const school = schoolMap[grade.schoolId] || {};
            return {
                id: grade.id,
                name: grade.name,
                schoolId: grade.schoolId,
                schoolName: school.name || null,
                districtName: districtMap[school.districtId] || null,
                districtId: school.districtId || null,
            };
        });

        // Filtrando as turmas com base no districtId do Inspetor
        let gradesToDisplay = gradesWithNames;

        if (req.user && req.user.role === 'Master' && req.query.districtId) {
            gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.query.districtId);
        } else if (req.user && req.user.districtId) {
            gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.user.districtId);
        }

        res.render("grades", {
            title: "Turmas",
            districts,
            role,
            schools: filteredSchools,
            grades: gradesToDisplay,
            user: req.user,
            districtId: req.query.districtId || (req.user ? req.user.districtId : null),
            districtMap: districtMap,
        });
    } catch (err) {
        console.error("Erro ao buscar dados para a página de turmas:", err);
        res.status(500).send("Erro ao carregar a página de turmas.");
    }
});

// Rota para listar todas as turmas (dados JSON)
router.get("/list", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        await gradeService.getAllGrades(req, res, accessToken);
    } catch (error) {
        next(error);
    }
});

// Rota para criar uma nova turma
router.post("/create", requireRole(["Master", "Inspetor", "Secretario"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        await gradeService.createGrade(req, res, accessToken);
    } catch (error) {
        next(error);
    }
});

// Rota para obter uma turma específica pelo ID
router.get("/:id", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        await gradeService.getGradeById(req, res, accessToken);
    } catch (error) {
        next(error);
    }
});

// Rota para atualizar uma turma pelo ID (apenas usuários com as roles especificadas podem atualizar)
router.put("/edit/:id", requireRole(["Master", "Inspetor", "Secretario"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        await gradeService.updateGrade(req, res, accessToken);
    } catch (error) {
        next(error);
    }
});

// Rota para excluir uma turma pelo ID (apenas usuários com as roles especificadas podem excluir)
router.delete("/delete/:id", requireRole(["Master", "Inspetor", "Secretario"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        await gradeService.deleteGrade(req, res, accessToken);
    } catch (error) {
        next(error);
    }
});

module.exports = router;