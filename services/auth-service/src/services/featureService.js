import { Feature } from '../models/Feature.js';
import { UserFeature } from '../models/User_feature.js';
import logger from './logger.js';

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
    }
};