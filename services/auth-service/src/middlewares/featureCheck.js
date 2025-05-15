import { featureService } from '../services/featureService.js';
import logger from '../services/logger.js';

/**
 * Middleware to check if user has required feature
 * @param {string} featureName - Name of the required feature
 * @param {string[]} allowedRoles - Array of roles that have access
 */
export const hasFeature = (featureName, allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            // Skip check for Master users
            if (req.user.role === 'Master') {
                return next();
            }

            // Check if user role is in allowed roles
            if (allowedRoles.length > 0 && allowedRoles.includes(req.user.role)) {
                logger.info(`User ${req.user.id} granted access to ${featureName} by role ${req.user.role}`);
                return next();
            }

            const userId = req.user.id;
            const hasAccess = await featureService.checkUserHasFeature(userId, featureName);

            if (!hasAccess) {
                logger.warn(`User ${userId} attempted to access feature ${featureName} without permission`);
                return res.status(403).json({
                    error: 'Acesso não autorizado',
                    message: 'Você não tem acesso a esta funcionalidade'
                });
            }

            logger.info(`User ${userId} accessed feature ${featureName}`);
            next();
        } catch (error) {
            logger.error('Error checking feature access:', error);
            return res.status(500).json({
                error: 'Erro interno',
                message: 'Erro ao verificar permissões'
            });
        }
    };
};