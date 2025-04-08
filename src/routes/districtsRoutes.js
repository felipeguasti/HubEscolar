    const express = require('express');
    const router = express.Router();
    const districtsService = require('../services/districtService'); // Importa o módulo para comunicar com o district-service
    const isAuthenticated = require('../middlewares/auth'); // Middleware de autenticação no sistema principal
    const requireRole = require('../middlewares/requireRole'); // Middleware para verificar roles (se aplicável no sistema principal)

    // Middleware de autenticação para todas as rotas abaixo
    router.use(isAuthenticated);

    // Rota para listar todos os distritos (chama o district-service)
    router.get("/", async (req, res) => {
        try {
            const districts = await districtsService.getAllDistricts(req.query.page, req.query.limit, req.headers.authorization?.split(' ')[1]);
            return res.json(districts);
        } catch (error) {
            console.error('Erro ao listar distritos:', error);
            return res.status(500).json({ message: 'Erro ao listar distritos', error: error.message });
        }
    });

    // Rota para obter um distrito específico pelo ID (chama o district-service)
    router.get("/:id", async (req, res) => {
        const { id } = req.params;
        try {
            const district = await districtsService.getDistrictById(id, req.headers.authorization?.split(' ')[1]);
            if (district) {
                return res.json(district);
            } else {
                return res.status(404).json({ message: 'Distrito não encontrado' });
            }
        } catch (error) {
            console.error(`Erro ao buscar distrito com ID ${id}:`, error);
            return res.status(500).json({ message: 'Erro ao buscar distrito', error: error.message });
        }
    });

    // Rotas protegidas (requerem role 'Master' no sistema principal para chamar o district-service)
    router.post("/", requireRole('Master'), async (req, res) => {
        try {
            const newDistrict = await districtsService.createDistrict(req.body, req.headers.authorization?.split(' ')[1]);
            return res.status(201).json(newDistrict);
        } catch (error) {
            console.error('Erro ao criar distrito:', error);
            return res.status(500).json({ message: 'Erro ao criar distrito', error: error.message });
        }
    });

    router.put("/:id", requireRole('Master'), async (req, res) => {
        const { id } = req.params;
        try {
            const updatedDistrict = await districtsService.updateDistrict(id, req.body, req.headers.authorization?.split(' ')[1]);
            return res.json(updatedDistrict);
        } catch (error) {
            console.error(`Erro ao atualizar distrito com ID ${id}:`, error);
            return res.status(500).json({ message: 'Erro ao atualizar distrito', error: error.message });
        }
    });

    router.delete("/:id", requireRole('Master'), async (req, res) => {
        const { id } = req.params;
        try {
            await districtsService.deleteDistrict(id, req.headers.authorization?.split(' ')[1]);
            return res.status(204).send(); // No content
        } catch (error) {
            console.error(`Erro ao deletar distrito com ID ${id}:`, error);
            return res.status(500).json({ message: 'Erro ao deletar distrito', error: error.message });
        }
    });

    module.exports = router;