import { featureService } from '../services/featureService.js';
import logger from '../services/logger.js';

export const featureController = {
    async createFeature(req, res) {
        try {
            const { name, description, route, status } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Nome da feature é obrigatório' });
            }

            const feature = await featureService.createFeature({ name, description, route, status });
            logger.info(`Feature created: ${feature.name}`);
            
            return res.status(201).json(feature);
        } catch (error) {
            logger.error('Error in createFeature:', error);
            return res.status(500).json({ error: 'Erro ao criar feature' });
        }
    },

    async updateFeature(req, res) {
        try {
            const { id } = req.params;
            const { name, description, route, status } = req.body;

            if (!id) {
                return res.status(400).json({ 
                    error: 'ID da feature é obrigatório' 
                });
            }

            if (!name) {
                return res.status(400).json({ 
                    error: 'Nome da feature é obrigatório' 
                });
            }

            if (!route) {
                return res.status(400).json({ 
                    error: 'Status da feature é obrigatório' 
                });
            }

            if (!status) {
                return res.status(400).json({ 
                    error: 'Status da feature é obrigatório' 
                });
            }

            // Verifica se a feature existe
            const existingFeature = await featureService.getFeatureById(id);
            
            if (!existingFeature) {
                return res.status(404).json({ 
                    error: 'Feature não encontrada' 
                });
            }

            // Atualiza a feature
            const updatedFeature = await featureService.updateFeature(id, { name, description, route, status });
            
            logger.info(`Feature ${id} updated successfully`);
            return res.status(200).json({
                message: 'Ferramenta atualizada com sucesso',
                feature: updatedFeature
            });
            
        } catch (error) {
            logger.error(`Error in updateFeature: ${error.message}`);
            return res.status(500).json({ 
                error: 'Erro ao atualizar ferramenta' 
            });
        }
    },

    async deleteFeature(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ 
                    error: 'ID da feature é obrigatório' 
                });
            }

            // Verifica se a feature existe antes de deletar
            const feature = await featureService.getFeatureById(id);
            
            if (!feature) {
                return res.status(404).json({ 
                    error: 'Feature não encontrada' 
                });
            }

            await featureService.deleteFeature(id);
            
            logger.info(`Feature ${id} deleted successfully`);
            return res.status(200).json({ 
                message: 'Ferramenta excluída com sucesso' 
            });
            
        } catch (error) {
            logger.error(`Error in deleteFeature: ${error.message}`);
            return res.status(500).json({ 
                error: 'Erro ao excluir ferramenta' 
            });
        }
    },

    async assignFeatureToUser(req, res) {
        try {
            const { userId, featureId } = req.body;
            const grantedBy = req.user.id; // ID do usuário que está fazendo a atribuição

            if (!userId || !featureId) {
                return res.status(400).json({ error: 'userId e featureId são obrigatórios' });
            }

            const userFeature = await featureService.assignFeatureToUser(userId, featureId, grantedBy);
            logger.info(`Feature ${featureId} assigned to user ${userId} by ${grantedBy}`);

            return res.status(200).json(userFeature);
        } catch (error) {
            logger.error('Error in assignFeatureToUser:', error);
            return res.status(500).json({ error: 'Erro ao atribuir feature ao usuário' });
        }
    },
    
    async unassignFeatureFromUser(req, res) {
        try {
            const { userId, featureId } = req.body;
    
            if (!userId || !featureId) {
                return res.status(400).json({ 
                    error: 'ID do usuário e ID da feature são obrigatórios' 
                });
            }
    
            await featureService.unassignFeatureFromUser(userId, featureId);
            
            logger.info(`Feature ${featureId} unassigned from user ${userId}`);
            return res.status(200).json({ 
                message: 'Ferramenta removida com sucesso' 
            });
            
        } catch (error) {
            logger.error(`Error in unassignFeatureFromUser: ${error.message}`);
            return res.status(500).json({ 
                error: 'Erro ao remover feature do usuário' 
            });
        }
    },
    
    async getUserFeatures(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ error: 'ID do usuário é obrigatório' });
            }

            const features = await featureService.getUserFeatures(userId);
            
            if (!features) {
                return res.status(404).json({ 
                    error: 'Nenhuma feature encontrada para este usuário' 
                });
            }

            logger.info(`Features retrieved for user ${userId}`);
            return res.status(200).json(features);
            
        } catch (error) {
            logger.error(`Error in getUserFeatures: ${error.message}`);
            return res.status(500).json({ error: 'Erro ao buscar features do usuário' });
        }
    },

    async checkFeature(req, res) {
        try {
            const { userId, featureName } = req.query;

            if (!userId || !featureName) {
                return res.status(400).json({ error: 'userId e featureName são obrigatórios' });
            }

            const hasFeature = await featureService.checkUserHasFeature(userId, featureName);
            return res.status(200).json({ hasFeature });
        } catch (error) {
            logger.error('Error in checkFeature:', error);
            return res.status(500).json({ error: 'Erro ao verificar feature do usuário' });
        }
    },

    async getAllFeatures(req, res) {
        try {
            const features = await featureService.getAllFeatures();
            logger.info('Features retrieved successfully');
            
            return res.status(200).json(features);
        } catch (error) {
            logger.error('Error in getAllFeatures:', error);
            return res.status(500).json({ error: 'Erro ao buscar features' });
        }
    },

    async getFeatureById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ error: 'ID da feature é obrigatório' });
            }

            const feature = await featureService.getFeatureById(id);
            
            if (!feature) {
                return res.status(404).json({ error: 'Feature não encontrada' });
            }

            logger.info(`Feature ${id} retrieved successfully`);
            return res.status(200).json(feature);
            
        } catch (error) {
            logger.error(`Error in getFeatureById: ${error.message}`);
            return res.status(500).json({ error: 'Erro ao buscar feature' });
        }
    }
};