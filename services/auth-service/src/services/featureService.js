import { Feature } from '../models/Feature.js';
import { UserFeature } from '../models/User_feature.js';
import logger from './logger.js';
import fetch from 'node-fetch';

export const featureService = {
    async createFeature(featureData) {
        try {
            const feature = await Feature.create(featureData);
            logger.info(`Feature created: ${feature.name}`);
            return feature;
        } catch (error) {
            logger.error('Error creating feature:', error);
            throw error;
        }
    },

    async updateFeature(featureId, featureData) {
        try {
            const feature = await Feature.findByPk(featureId);
            
            if (!feature) {
                throw new Error('Feature não encontrada');
            }

            // Update only valid feature attributes
            await feature.update({
                name: featureData.name,
                description: featureData.description,
                route: featureData.route,
                status: featureData.status
            });

            logger.info(`Feature ${featureId} updated successfully`);
            return feature;
            
        } catch (error) {
            logger.error(`Error updating feature ${featureId}:`, error);
            throw error;
        }
    },

    async deleteFeature(featureId) {
        try {
            // Check if feature exists first
            const feature = await Feature.findByPk(featureId);
            
            if (!feature) {
                throw new Error('Feature não encontrada');
            }

            // Delete associated user features first
            await UserFeature.destroy({
                where: { feature_id: featureId }
            });

            // Delete the feature
            await feature.destroy();
            
            logger.info(`Feature ${featureId} deleted successfully`);
            return true;
            
        } catch (error) {
            logger.error(`Error deleting feature ${featureId}:`, error);
            throw error;
        }
    },

    async assignFeatureToUser(userId, featureId, grantedBy) {
        try {
            const userFeature = await UserFeature.create({
                user_id: userId,
                feature_id: featureId,
                granted_by: grantedBy,
                status: 'active'
            });
            logger.info(`Feature ${featureId} assigned to user ${userId}`);
            return userFeature;
        } catch (error) {
            logger.error('Error assigning feature:', error);
            throw error;
        }
    },
    
    async unassignFeatureFromUser(userId, featureId) {
        try {
            const result = await UserFeature.destroy({
                where: {
                    user_id: userId,
                    feature_id: featureId
                }
            });
    
            if (!result) {
                throw new Error('Associação não encontrada');
            }
    
            logger.info(`Feature ${featureId} unassigned from user ${userId}`);
            return true;
            
        } catch (error) {
            logger.error(`Error unassigning feature: ${error.message}`);
            throw new Error('Erro ao remover feature do usuário');
        }
    },
    
    async getUserFeatures(userId) {
        try {
            const features = await Feature.findAll({
                include: [{
                    model: UserFeature,
                    as: 'userFeatures', 
                    where: { user_id: userId },
                    attributes: ['status', 'granted_by', 'created_at']
                }]
            });

            logger.info(`Features retrieved for user ${userId}`);
            return features;
            
        } catch (error) {
            logger.error(`Error getting user features: ${error.message}`);
            throw new Error('Erro ao buscar features do usuário');
        }
    },

    async checkUserHasFeature(userId, featureName) {
        try {
            const feature = await Feature.findOne({
                where: { name: featureName }
            });
            
            if (!feature) return false;

            const userFeature = await UserFeature.findOne({
                where: {
                    user_id: userId,
                    feature_id: feature.id,
                    status: 'active'
                }
            });

            return !!userFeature;
        } catch (error) {
            logger.error('Error checking user feature:', error);
            throw error;
        }
    },

    async getAllFeatures() {
        try {
            const features = await Feature.findAll({
                include: [{
                    model: UserFeature,
                    as: 'userFeatures', // Added alias to match association definition
                    attributes: ['user_id', 'status', 'granted_by', 'created_at']
                }]
            });
            
            logger.info('All features retrieved successfully');
            return features;
        } catch (error) {
            logger.error('Error getting all features:', error);
            throw error;
        }
    },

    async getFeatureById(featureId) {
        try {
            const feature = await Feature.findByPk(featureId, {
                include: [{
                    model: UserFeature,
                    as: 'userFeatures',
                    attributes: ['user_id', 'status', 'granted_by', 'created_at']
                }]
            });
            
            if (!feature) {
                throw new Error('Feature não encontrada');
            }

            logger.info(`Feature ${featureId} retrieved successfully`);
            return feature;
        } catch (error) {
            logger.error(`Error getting feature ${featureId}:`, error);
            throw error;
        }
    },

    async assignFeatureToBatch(featureId, role, districtId = null, schoolId = null, grantedBy, token) {
        try {
            // Verificar se a feature existe
            const feature = await Feature.findByPk(featureId);
            if (!feature) {
                return { success: false, error: 'Feature não encontrada' };
            }
            
            // Buscar usuários com os critérios especificados
            let userIds = await this.getUserIdsByFilters(role, districtId, schoolId, token);
            
            if (!userIds || userIds.length === 0) {
                return { success: false, error: 'Nenhum usuário encontrado com os critérios especificados' };
            }
            
            // Atribuir feature para cada usuário encontrado
            let successCount = 0;
            for (const userId of userIds) {
                try {
                    // Verificar se o usuário já possui a feature
                    const existing = await UserFeature.findOne({
                        where: { user_id: userId, feature_id: featureId }
                    });
                    
                    // Se não existir, criar novo registro
                    if (!existing) {
                        await UserFeature.create({
                            user_id: userId,
                            feature_id: featureId,
                            granted_by: grantedBy,
                            status: 'active'
                        });
                        successCount++;
                    }
                } catch (userError) {
                    logger.error(`Error assigning feature to user ${userId}:`, userError);
                    // Continue para os próximos usuários mesmo se houver erro em um
                }
            }
            
            logger.info(`Feature ${featureId} assigned to ${successCount} users with role ${role}`);
            return { success: true, count: successCount };
        } catch (error) {
            logger.error('Error assigning feature to batch:', error);
            throw error;
        }
    },

    async removeFeatureFromBatch(featureId, role, districtId = null, schoolId = null, token) {
        try {
            // Verificar se a feature existe
            const feature = await Feature.findByPk(featureId);
            if (!feature) {
                return { success: false, error: 'Feature não encontrada' };
            }
            
            // Log dos parâmetros recebidos para debug
            logger.info(`Removing feature ${featureId} from users with: role=${role}, districtId=${districtId}, schoolId=${schoolId}`);
            
            // Buscar usuários com os critérios especificados
            let userIds = await this.getUserIdsByFilters(role, districtId, schoolId, token);
            
            // Log dos usuários encontrados
            logger.info(`Found ${userIds?.length || 0} users matching the criteria`);
            
            if (!userIds || userIds.length === 0) {
                return { success: false, error: 'Nenhum usuário encontrado com os critérios especificados' };
            }
            
            // Verificar quais desses usuários têm a feature antes de remover
            const usersWithFeature = await UserFeature.findAll({
                where: {
                    user_id: userIds,
                    feature_id: featureId
                },
                attributes: ['user_id']
            });
            
            const userIdsWithFeature = usersWithFeature.map(uf => uf.user_id);
            logger.info(`Of those, ${userIdsWithFeature.length} users have the feature`);
            
            if (userIdsWithFeature.length === 0) {
                return { 
                    success: false, 
                    error: 'Nenhum dos usuários encontrados possui esta feature' 
                };
            }
            
            // Remover feature apenas dos usuários que realmente têm a feature
            const result = await UserFeature.destroy({
                where: {
                    user_id: userIdsWithFeature,
                    feature_id: featureId
                }
            });
            
            logger.info(`Feature ${featureId} removed from ${result} users with role ${role}`);
            return { 
                success: true, 
                count: result,
                message: `Feature removida com sucesso de ${result} usuários`
            };
        } catch (error) {
            logger.error('Error removing feature from batch:', error);
            throw error;
        }
    },

    // Função auxiliar corrigida para incluir autenticação
    async getUserIdsByFilters(role, districtId, schoolId, token) {
        try {
            // Esta função fará uma chamada para o microserviço users-service
            // para obter os IDs dos usuários com base nos filtros
            const queryParams = new URLSearchParams();
            if (role) queryParams.append('role', role);
            if (districtId) queryParams.append('districtId', districtId);
            if (schoolId) queryParams.append('schoolId', schoolId);
            
            // Montar a URL e fazer log para debug
            const url = `${process.env.USERS_SERVICE_URL}/users/filter?${queryParams.toString()}`;
            logger.info(`Fetching users with URL: ${url}`);
            
            // Adicionamos o token no header Authorization
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Error response from users service: ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`Error fetching users: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Verificar se a resposta tem a estrutura esperada
            if (!data || !data.users || !Array.isArray(data.users)) {
                logger.error(`Unexpected response format from users service: ${JSON.stringify(data)}`);
                throw new Error('Unexpected response format from users service');
            }
            
            // Log para debug da resposta
            logger.info(`Found ${data.users.length} users with the specified filters`);
            
            // Retornar apenas os IDs dos usuários
            return data.users.map(user => user.id);
        } catch (error) {
            logger.error('Error getting user IDs by filters:', error);
            throw error;
        }
    }
};