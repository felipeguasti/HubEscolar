import express from 'express';
import { featureController } from '../controllers/featureController.js';
import { authMiddleware as isAuthenticated } from '../middlewares/auth.js';
import { hasFeature } from '../middlewares/featureCheck.js';

const router = express.Router();

// Apenas Master e Inspetor podem gerenciar features
const isMasterOrInspector = (req, res, next) => {
    if (['Master', 'Inspetor'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Acesso não autorizado' });
    }
};

// Criar nova feature (Master/Inspetor)
router.post('/create', 
    isAuthenticated, 
    isMasterOrInspector, 
    featureController.createFeature
);

// Atualizar uma feature (Master/Inspetor)
router.put('/update/:id', 
    isAuthenticated, 
    isMasterOrInspector, 
    featureController.updateFeature
);

// Excluir uma feature (Master/Inspetor)
router.delete('/delete/:id', 
    isAuthenticated, 
    isMasterOrInspector, 
    featureController.deleteFeature
);

// Atribuir feature a um usuário (Master/Inspetor)
router.post('/assign', 
    isAuthenticated, 
    hasFeature('check_user_features', ['Inspetor', 'Secretario', 'Diretor']),
    featureController.assignFeatureToUser
);

// Remover feature de um usuário (Master/Inspetor)
router.delete('/assign', 
    isAuthenticated, 
    hasFeature('check_user_features', ['Inspetor', 'Secretario', 'Diretor']),
    featureController.unassignFeatureFromUser
);

// Buscar features de um usuário
router.get('/user/:userId', 
    isAuthenticated,
    (req, res, next) => {
        // Se estiver buscando features de outro usuário
        if (req.params.userId && req.params.userId !== req.user.id) {
            return hasFeature('view_other_user_features', ['Inspetor', 'Secretario', 'Diretor', 'Coordenador', 'Pedagogo', 'Aluno', 'Professor'])(req, res, next);
        }
        next();
    },
    featureController.getUserFeatures
);

// Buscar features do usuário logado
router.get('/user', 
    isAuthenticated,
    featureController.getUserFeatures
);

// Verificar se usuário tem uma feature específica
router.get('/check', 
    isAuthenticated,
    hasFeature('check_user_features', ['Inspetor', 'Secretario', 'Diretor', 'Coordenador', 'Pedagogo', 'Aluno', 'Professor']),
    featureController.checkFeature
);

// Listar todas as features
router.get('/list/:id', 
    isAuthenticated, 
    featureController.getFeatureById
);

// Listar todas as features
router.get('/list', 
    isAuthenticated, 
    featureController.getAllFeatures
);

export default router;