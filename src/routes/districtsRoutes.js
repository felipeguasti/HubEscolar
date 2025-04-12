    const express = require('express');
    const router = express.Router();
    const districtsService = require('../services/districtService');
    const isAuthenticated = require('../middlewares/auth');
    const requireRole = require('../middlewares/requireRole');
    const usersService = require('../services/usersService');

    // Middleware de autenticação para todas as rotas abaixo
    router.use(isAuthenticated);

    router.get('/', isAuthenticated, async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const user = await usersService.getUserById(req.user.id, accessToken);
    
        try {
            const districts = await districtsService.getAllDistricts(accessToken);
            res.render('districts', { districts: districts.data, user: user, title:'Distritos' });

        } catch (error) {
            console.error('Erro ao buscar e renderizar a página de distritos:', error);
            res.status(500).send('Erro ao carregar a página de distritos');
        }
    });
    

    // Rota para listar todos os distritos (chama o district-service)
    router.get("/", async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const districts = await districtsService.getAllDistricts(req.query.page, req.query.limit, accessToken);
            return res.json(districts);
        } catch (error) {
            console.error('Erro ao listar distritos:', error);
            return res.status(500).json({ message: 'Erro ao listar distritos', error: error.message });
        }
    });

    // Rota para obter um distrito específico pelo ID (chama o district-service)
    router.get("/:id", async (req, res) => {
        const { id } = req.params;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const district = await districtsService.getDistrictById(id, accessToken);
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
    router.post("/create", requireRole('Master'), async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const newDistrict = await districtsService.createDistrict(req.body, accessToken);
            return res.status(201).json(newDistrict);
        } catch (error) {
            console.error('Erro ao criar distrito:', error);
            return res.status(500).json({ message: 'Erro ao criar distrito', error: error.message });
        }
    });

    router.put("/edit/:id", requireRole('Master'), async (req, res) => {
        const { id } = req.params;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        console.log('[HubEscolar - /districts/edit/:id] Valor do accessToken antes de chamar o serviço:', accessToken);
        try {
            const updatedDistrict = await districtsService.updateDistrict(id, req.body, accessToken);
            return res.json(updatedDistrict);
        } catch (error) {
            console.error(`Erro ao atualizar distrito com ID ${id}:`, error);
            return res.status(500).json({ message: 'Erro ao atualizar distrito', error: error.message });
        }
    });

    router.delete("/delete/:id", requireRole('Master'), async (req, res) => {
        const { id } = req.params;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            await districtsService.deleteDistrict(id, accessToken);
            return res.status(response.status).json(response.data);
        } catch (error) {
            console.error(`Erro ao deletar distrito com ID ${id}:`, error);
            return res.status(500).json({ message: 'Erro ao deletar distrito', error: error.message });
        }
    });

    module.exports = router;