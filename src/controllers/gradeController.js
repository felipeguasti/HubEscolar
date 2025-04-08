const gradesService = require('../models/Grade');
const districtsService = require('../services/districtService');
const schoolsService = require('../services/schoolService');

// Renderiza a página de turmas com os dados necessários
exports.renderGradesPage = async (req, res) => {
    try {
        const districtsResponse = await districtsService.getAllDistricts(1, 0, req.headers.authorization?.split(' ')[1]); // Obter todos os distritos
        const schoolsResponse = await schoolsService.getAllSchools(req.headers.authorization?.split(' ')[1]); // Obter todas as escolas
        const gradesResponse = await gradesService.getAllGrades(req.query.schoolId, req.headers.authorization?.split(' ')[1]); // Obter todas as turmas ou por escola

        const districts = districtsResponse.results || districtsResponse;
        const schools = schoolsResponse;
        const grades = gradesResponse.results || gradesResponse;

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
        if (req.user.districtId) {
            filteredSchools = schools.filter(school => school.districtId === req.user.districtId);
        }

        const gradesWithNames = grades.map(grade => {
            const school = schoolMap[grade.schoolId] || {};
            return {
                id: grade.id,
                name: grade.name,
                schoolId: grade.schoolId,
                schoolName: school.name || "Desconhecido",
                districtName: districtMap[school.districtId] || "Desconhecido",
                districtId: school.districtId || null,
            };
        });

        // Filtrando as turmas com base no districtId do Inspetor
        let gradesToDisplay = gradesWithNames;

        if (req.user.role === 'Master' && req.query.districtId) {
            gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.query.districtId);
        } else if (req.user.districtId) {
            gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.user.districtId);
        }

        res.render("grades", {
            title: "Turmas",
            districts,
            schools: filteredSchools,
            grades: gradesToDisplay,
            user: req.user,
            districtId: req.query.districtId || req.user.districtId,
            districtMap: districtMap,
        });
    } catch (err) {
        console.error("Erro ao buscar dados para a página de turmas:", err);
        res.status(500).send("Erro ao carregar a página de turmas.");
    }
};

// Buscar uma turma pelo ID
exports.getGradeById = async (req, res) => {
    try {
        const { id } = req.params;
        const grade = await gradesService.getGradeById(id, req.headers.authorization?.split(' ')[1]);
        if (!grade) {
            return res.status(404).json({ error: "Turma não encontrada" });
        }
        res.json(grade);
    } catch (error) {
        console.error("Erro ao buscar turma por ID:", error);
        res.status(500).json({ error: "Erro ao buscar turma" });
    }
};

// Listar todas as turmas ou turmas por escola
exports.getAllGrades = async (req, res) => {
    const schoolId = req.query.schoolId;
    try {
        const grades = await gradesService.getAllGrades(schoolId, req.headers.authorization?.split(' ')[1]);
        res.json(grades);
    } catch (error) {
        console.error("Erro ao buscar turmas:", error);
        res.status(500).json({ error: "Erro ao buscar turmas" });
    }
};

// Criar uma nova turma (Apenas Master)
exports.createGrade = async (req, res) => {
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }
    try {
        const newGrade = await gradesService.createGrade(req.body, req.headers.authorization?.split(' ')[1]);
        res.status(201).json(newGrade);
    } catch (error) {
        console.error("Erro ao criar turma:", error);
        res.status(500).json({ error: "Erro ao criar turma", details: error.message });
    }
};

// Atualizar uma turma (Apenas Master)
exports.updateGrade = async (req, res) => {
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }
    try {
        const { id } = req.params;
        const updatedGrade = await gradesService.updateGrade(id, req.body, req.headers.authorization?.split(' ')[1]);
        res.json(updatedGrade);
    } catch (error) {
        console.error("Erro ao atualizar turma:", error);
        res.status(500).json({ error: "Erro ao atualizar turma" });
    }
};

// Excluir uma turma (Apenas Master)
exports.deleteGrade = async (req, res) => {
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }
    try {
        const { id } = req.params;
        await gradesService.deleteGrade(id, req.headers.authorization?.split(' ')[1]);
        res.json({ message: "Turma excluída com sucesso" });
    } catch (error) {
        console.error("Erro ao excluir turma:", error);
        res.status(500).json({ error: "Erro ao excluir turma" });
    }
};