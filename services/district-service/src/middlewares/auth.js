const axios = require('axios');
const AppError = require('../errors/AppError');

const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            throw new AppError('Token não fornecido', 401);
        }

        const response = await axios.post(`${process.env.MAIN_SERVICE_URL}/api/auth/verify`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });

        req.user = response.data;
        next();
    } catch (error) {
        if (error.response) {
            next(new AppError(error.response.data.message || 'Erro de autenticação', error.response.status));
        } else {
            next(new AppError('Erro ao verificar autenticação', 500));
        }
    }
};

const requireRole = (role) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new AppError('Usuário não autenticado', 401);
            }

            if (req.user.role !== role) {
                throw new AppError('Acesso não autorizado', 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    requireAuth,
    requireRole
}; 