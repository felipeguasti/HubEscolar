const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Error:', err);

    // Erros de validação
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }

    // Erros de autenticação
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Authentication Error',
            error: err.message
        });
    }

    // Erros do WhatsApp
    if (err.name === 'WhatsAppError') {
        return res.status(503).json({
            success: false,
            message: 'WhatsApp Service Error',
            error: err.message
        });
    }

    // Erro genérico
    return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
};

module.exports = errorHandler;