const AppError = require('../errors/AppError');

const paginate = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'DESC';

    if (page < 1) {
        throw new AppError('Número da página deve ser maior que 0', 400);
    }

    if (limit < 1 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
    }

    if (!['ASC', 'DESC'].includes(sortOrder.toUpperCase())) {
        throw new AppError('Ordem de classificação inválida', 400);
    }

    req.pagination = {
        page,
        limit,
        offset: (page - 1) * limit,
        sortBy,
        sortOrder: sortOrder.toUpperCase()
    };

    next();
};

module.exports = paginate; 