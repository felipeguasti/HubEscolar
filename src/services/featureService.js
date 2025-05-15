const axios = require('axios');
const logger = require('../utils/logger');
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3004';

const featureService = {
    baseURL: `${AUTH_SERVICE_URL}/features`,

    async createFeature(featureData, token) {
        try {
            const response = await axios.post(`${this.baseURL}/create`, 
                {
                    name: featureData.name,
                    description: featureData.description,
                    route: featureData.route,
                    status: featureData.status
                },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            logger.info(`Feature created: ${featureData.name}`);
            return response.data;
        } catch (error) {
            logger.error('Error creating feature:', error.message);
            throw new Error(error.response?.data?.error || 'Erro ao criar feature');
        }
    },
    
    async updateFeature(featureId, featureData, token) {
        try {
            const response = await axios.put(`${this.baseURL}/update/${featureId}`, 
                featureData,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            if (response.status === 200) {
                logger.info(`Feature ${featureId} updated successfully`);
                return response.data;
            }
            
            throw new Error('Erro ao atualizar ferramenta');
            
        } catch (error) {
            logger.error(`Error updating feature: ${error.message}`);
            throw new Error(error.response?.data?.error || 'Erro ao atualizar ferramenta');
        }
    },
    
    async deleteFeature(featureId, token) {
        try {
            const response = await axios.delete(`${this.baseURL}/delete/${featureId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                logger.info(`Feature ${featureId} deleted successfully`);
                return response.data;
            }
            
            throw new Error('Erro ao excluir ferramenta');
            
        } catch (error) {
            logger.error(`Error deleting feature: ${error.message}`);
            throw new Error(error.response?.data?.error || 'Erro ao excluir ferramenta');
        }
    },

    async assignFeatureToUser(userId, featureId, token) {
        try {
            const response = await axios.post(`${this.baseURL}/assign`,
                { userId, featureId },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            logger.info(`Feature ${featureId} assigned to user ${userId}`);
            return response.data;
        } catch (error) {
            logger.error('Error assigning feature:', error.message);
            throw new Error(error.response?.data?.error || 'Erro ao atribuir feature ao usuário');
        }
    },

    async unassignFeatureFromUser(userId, featureId, token) {
        try {
            const response = await axios.delete(`${this.baseURL}/assign`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { userId, featureId }
            });
            
            if (response.status === 200) {
                logger.info(`Feature ${featureId} unassigned from user ${userId}`);
                return response.data;
            }
            
            throw new Error('Erro ao remover feature');
            
        } catch (error) {
            logger.error(`Error unassigning feature: ${error.message}`);
            throw new Error('Erro ao remover feature do usuário');
        }
    },

    async getUserFeatures(userId, token) {
        try {
            const response = await axios.get(`${this.baseURL}/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                logger.info(`Retrieved features for user ${userId}`);
                return response.data;
            }
            
            throw new Error('Features não encontradas');
            
        } catch (error) {
            logger.error(`Error getting user features: ${error.message}`);
            throw new Error('Erro ao buscar features do usuário');
        }
    },

    async checkFeature(userId, featureName, token) {
        try {
            const response = await axios.get(`${this.baseURL}/check`, {
                params: { userId, featureName },
                headers: { Authorization: `Bearer ${token}` }
            });
            logger.debug(`Checked feature ${featureName} for user ${userId}`);
            return response.data.hasFeature;
        } catch (error) {
            logger.error('Error checking feature:', error.message);
            throw new Error(error.response?.data?.error || 'Erro ao verificar feature do usuário');
        }
    },

    async getAllFeatures(token) {
        try {
            const response = await axios.get(`${this.baseURL}/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                logger.info('Retrieved all features');
                return response.data;
            }
            
            throw new Error('Erro ao buscar features');
            
        } catch (error) {
            logger.error('Error getting all features', error.message);
            throw new Error('Erro ao buscar todas as ferramentas');
        }
    },

    async getFeatureById(featureId, token) {
        try {
            const response = await axios.get(`${this.baseURL}/list/${featureId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                logger.info(`Retrieved feature ${featureId}`);
                return response.data;
            }
            
            throw new Error('Feature não encontrada');
            
        } catch (error) {
            logger.error(`Error getting feature ${featureId}`, error.message);
            throw new Error('Erro ao buscar feature');
        }
    }
};

module.exports = featureService;