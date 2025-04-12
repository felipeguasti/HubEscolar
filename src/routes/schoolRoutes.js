const express = require('express');
const router = express.Router();
const schoolsService = require('../services/schoolService'); 
const isAuthenticated = require('../middlewares/auth');

// Middleware de autenticação para todas as rotas abaixo
router.use(isAuthenticated);

// Rota para criar uma nova escola (chama o school-service)
router.post("/create", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        // Adiciona o status "active" ao corpo da requisição
        const schoolData = { ...req.body, status: "active" };
        const newSchool = await schoolsService.createSchool(schoolData, accessToken);
        return res.status(201).json(newSchool);
    } catch (error) {
        console.error('Erro ao criar escola:', error);
        return res.status(500).json({ message: 'Erro ao criar escola', error: error.message });
    }
});

// Rota para listar todas as escolas (chama o school-service)
router.get("/list", async (req, res) => {
    try {
        // Obtenha o accessToken da mesma forma que no middleware
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const districtId = req.query.districtId;
        const schools = await schoolsService.getAllSchools(accessToken, districtId);
        return res.json(schools);
    } catch (error) {
        console.error('Erro ao listar escolas:', error);
        return res.status(500).json({ message: 'Erro ao listar escolas', error: error.message });
    }
});

// Rota para obter uma escola específica pelo ID (chama o school-service)
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const school = await schoolsService.getSchoolById(id, accessToken);
        if (school) {
            return res.json(school);
        } else {
            return res.status(404).json({ message: 'Escola não encontrada' });
        }
    } catch (error) {
        console.error(`Erro ao buscar escola com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao buscar escola', error: error.message });
    }
});

// Rota para atualizar uma escola pelo ID (chama o school-service)
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const updatedSchool = await schoolsService.updateSchool(id, accessToken);
        return res.json(updatedSchool);
    } catch (error) {
        console.error(`Erro ao atualizar escola com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao atualizar escola', error: error.message });
    }
});

// Rota para excluir uma escola pelo ID (chama o school-service)
router.delete("/delete/:id", async (req, res) => {
    const { id } = req.params;
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const response = await schoolsService.deleteSchool(id, accessToken);
        return res.json(response)
    } catch (error) {
        console.error(`[HubEscolar - DELETE /schools/delete/${id}] Erro ao deletar escola com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao deletar escola', error: error.message });
    }
});

module.exports = router;