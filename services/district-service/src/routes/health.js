const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
    try {
        const health = {
            status: 'UP',
            timestamp: new Date().toISOString(),
            services: {
                redis: 'UP'
            }
        };

        // Verificar conexão com Redis
        try {
            await cacheService.client.ping();
        } catch (error) {
            logger.error('Erro na conexão com Redis:', error);
            health.services.redis = 'DOWN';
            health.status = 'DEGRADED';
        }

        res.json(health);
    } catch (error) {
        logger.error('Erro no health check:', error);
        res.status(500).json({
            status: 'DOWN',
            timestamp: new Date().toISOString(),
            error: 'Erro interno no health check'
        });
    }
});

module.exports = router; 