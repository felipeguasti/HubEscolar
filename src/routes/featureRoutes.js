const express = require('express');
const router = express.Router();
const featureService = require('../services/featureService');
const usersService = require('../services/usersService');
const districtsService = require('../services/districtService');
const isAuthenticated = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

// Middleware de autenticação para todas as rotas
router.use(isAuthenticated);

// Rota principal - Dashboard de ferramentas do usuário
router.get('/', 
    isAuthenticated,
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const user = req.user;
            
            const userFeatures = await featureService.getUserFeatures(user.id, accessToken);    
            const activeFeatures = userFeatures.filter(feature => feature.status === 'active');

            const groupedFeatures = {
                administrative: activeFeatures.filter(f => f.route.startsWith('/admin')),
                academic: activeFeatures.filter(f => f.route.startsWith('/academic')),
                reports: activeFeatures.filter(f => f.route.startsWith('/reports')),
                other: activeFeatures.filter(f => 
                    !f.route.startsWith('/admin') && 
                    !f.route.startsWith('/academic') && 
                    !f.route.startsWith('/reports')
                )
            };

            res.render('features/dashboard', { 
                title: 'Minhas Ferramentas',
                user,
                features: activeFeatures,
                groupedFeatures
            });

        } catch (error) {
            console.error('Erro ao carregar dashboard de features:', error);
            res.status(500).send('Erro ao carregar ferramentas disponíveis');
        }
    }
);

// Rota para página de configurações de features
router.get('/settings', 
    isAuthenticated, 
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']), 
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            // Busca dados do usuário logado
            const user = await usersService.getUserById(req.user.id, accessToken);
            
            // Busca todas as features disponíveis
            const features = await featureService.getAllFeatures(accessToken);

            // Chamar o districts-service para obter a lista de distritos
            const districts = await districtsService.getAllDistricts(accessToken, 1, 100);
            
            res.render('features/settings', { 
                title: 'Configurações das Ferramentas',
                user: user,
                features: features,
                districts: districts.data
            });
        } catch (error) {
            console.error('Erro ao carregar página de configurações de features:', error);
            res.status(500).send('Erro ao carregar configurações das ferramentas');
        }
    }
);

// Criar nova feature
router.post('/create',
    requireRole(['Master', 'Inspetor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const { name, description, route, status } = req.body;
            const feature = await featureService.createFeature(
                { name, description, route, status },
                accessToken
            );
            res.json(feature);
        } catch (error) {
            console.error('Erro ao criar feature:', error);
            res.status(500).json({ error: 'Erro ao criar feature' });
        }
    }
);

// Atualizar uma feature
router.put('/update/:id',
    requireRole(['Master', 'Inspetor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const { name, description, route, status } = req.body;
            const result = await featureService.updateFeature(
                req.params.id,
                { name, description, route, status },
                accessToken
            );
            res.json(result);
        } catch (error) {
            console.error('Erro ao atualizar feature:', error);
            res.status(500).json({ error: 'Erro ao atualizar feature' });
        }
    }
);

// Deletar uma feature
router.delete('/delete/:id',
    requireRole(['Master', 'Inspetor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const result = await featureService.deleteFeature(req.params.id, accessToken);
            res.json(result);
        } catch (error) {
            console.error('Erro ao excluir feature:', error);
            res.status(500).json({ error: 'Erro ao excluir feature' });
        }
    }
);

// Atribuir feature a um usuário
router.post('/assign',
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const { userId, featureId } = req.body;
            const result = await featureService.assignFeatureToUser(userId, featureId, accessToken);
            res.json(result);
        } catch (error) {
            console.error('Erro ao atribuir feature:', error);
            res.status(500).json({ error: 'Erro ao atribuir feature ao usuário' });
        }
    }
);

// Remover feature de um usuário
router.delete('/assign',
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const { userId, featureId } = req.body;
            const result = await featureService.unassignFeatureFromUser(userId, featureId, accessToken);
            res.json(result);
        } catch (error) {
            console.error('Erro ao remover feature:', error);
            res.status(500).json({ error: 'Erro ao remover feature do usuário' });
        }
    }
);

// Obter features de um usuário específico
router.get('/user/:userId',
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const features = await featureService.getUserFeatures(req.params.userId, accessToken);
            res.json(features);
        } catch (error) {
            console.error('Erro ao buscar features do usuário:', error);
            res.status(500).json({ error: 'Erro ao buscar features do usuário' });
        }
    }
);

// Verificar se usuário tem acesso a feature específica
router.get('/check',
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const { userId, featureName } = req.query;
            const hasFeature = await featureService.checkFeature(userId, featureName, accessToken);
            res.json({ hasFeature });
        } catch (error) {
            console.error('Erro ao verificar acesso à feature:', error);
            res.status(500).json({ error: 'Erro ao verificar acesso à feature' });
        }
    }
);

// Listar todas as features
router.get('/list',
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const features = await featureService.getAllFeatures(accessToken);
            res.json(features);
        } catch (error) {
            console.error('Erro ao listar features:', error);
            res.status(500).json({ error: 'Erro ao listar features' });
        }
    }
);

// Obter feature por ID
router.get('/list/:id',
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const feature = await featureService.getFeatureById(req.params.id, accessToken);
            res.json(feature);
        } catch (error) {
            console.error('Erro ao buscar feature:', error);
            res.status(500).json({ error: 'Erro ao buscar feature' });
        }
    }
);

// Atribuir feature a usuários em lote
router.post('/assign-batch',
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const { featureId, role, districtId, schoolId } = req.body;
            
            if (!featureId || !role) {
                return res.status(400).json({ error: 'Feature ID e cargo são obrigatórios' });
            }
            
            const result = await featureService.assignFeatureToBatch(
                featureId, 
                role, 
                districtId, 
                schoolId, 
                accessToken
            );
            res.json(result);
        } catch (error) {
            console.error('Erro ao atribuir feature em lote:', error);
            res.status(500).json({ error: 'Erro ao atribuir feature em lote' });
        }
    }
);

// Remover feature de usuários em lote
router.post('/remove-batch',
    requireRole(['Master', 'Inspetor', 'Secretario', 'Diretor']),
    async (req, res) => {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        try {
            const { featureId, role, districtId, schoolId } = req.body;
            
            if (!featureId || !role) {
                return res.status(400).json({ error: 'Feature ID e cargo são obrigatórios' });
            }
            
            const result = await featureService.removeFeatureFromBatch(
                featureId, 
                role, 
                districtId, 
                schoolId, 
                accessToken
            );
            res.json(result);
        } catch (error) {
            console.error('Erro ao remover feature em lote:', error);
            res.status(500).json({ error: 'Erro ao remover feature em lote' });
        }
    }
);

module.exports = router;