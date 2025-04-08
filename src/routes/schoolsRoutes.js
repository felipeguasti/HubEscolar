const express = require('express');
const router = express.Router();
const schoolsService = require('../services/schoolService'); // Importa o módulo para comunicar com o school-service
const isAuthenticated = require('../middlewares/auth'); // Middleware de autenticação no sistema principal

// Middleware de autenticação para todas as rotas abaixo
router.use(isAuthenticated);

// Rota para criar uma nova escola (chama o school-service)
router.post("/", async (req, res) => {
    try {
        const newSchool = await schoolsService.createSchool(req.body, req.headers.authorization?.split(' ')[1]);
        return res.status(201).json(newSchool);
    } catch (error) {
        console.error('Erro ao criar escola:', error);
        return res.status(500).json({ message: 'Erro ao criar escola', error: error.message });
    }
});

// Rota para listar todas as escolas (chama o school-service)
router.get("/", async (req, res) => {
    try {
        const schools = await schoolsService.getAllSchools(req.headers.authorization?.split(' ')[1]);
        return res.json(schools);
    } catch (error) {
        console.error('Erro ao listar escolas:', error);
        return res.status(500).json({ message: 'Erro ao listar escolas', error: error.message });
    }
});

// Rota para obter uma escola específica pelo ID (chama o school-service)
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const school = await schoolsService.getSchoolById(id, req.headers.authorization?.split(' ')[1]);
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
    try {
        const updatedSchool = await schoolsService.updateSchool(id, req.body, req.headers.authorization?.split(' ')[1]);
        return res.json(updatedSchool);
    } catch (error) {
        console.error(`Erro ao atualizar escola com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao atualizar escola', error: error.message });
    }
});

// Rota para excluir uma escola pelo ID (chama o school-service)
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await schoolsService.deleteSchool(id, req.headers.authorization?.split(' ')[1]);
        return res.status(204).send(); // No content
    } catch (error) {
        console.error(`Erro ao deletar escola com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao deletar escola', error: error.message });
    }
});

module.exports = router;