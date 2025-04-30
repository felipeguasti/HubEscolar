import { validationResult } from 'express-validator';
import logger from '../services/logger.js';

export const validationResultHandler = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Erros de validação encontrados:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export default validationResultHandler;