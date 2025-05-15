const AppError = require('../errors/AppError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log do erro
    logger.error({
        message: err.message,
        stack: err.stack,
        details: err.details,
        path: req.path,
        method: req.method,
        params: req.params,
        body: req.body,
        user: req.user?.id
    });

    // Se for um erro de validação do Joi
    if (err.isJoi) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: err.details.map(detail => detail.message)
        });
    }

    // Se for um erro do Sequelize
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            error: 'Erro de validação do banco de dados',
            details: err.errors.map(e => e.message)
        });
    }

    // Se for um erro personalizado
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            details: err.details
        });
    }

    // Erro não tratado
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro inesperado'
    });
};

module.exports = errorHandler; 