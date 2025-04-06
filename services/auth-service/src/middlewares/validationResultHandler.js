const { validationResult } = require('express-validator');
const logger = require('../services/logger'); // Importe o logger

const validationResultHandler = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Erros de validação encontrados:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = validationResultHandler;