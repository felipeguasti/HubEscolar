const axios = require('axios');
const AppError = require('../errors/AppError');
const logger = require('../services/logger');
const jwt = require('jsonwebtoken');

const requireAuth = async (req, res, next) => {
    let token = null;

    console.log('[District Service - requireAuth] Iniciando middleware requireAuth para:', req.originalUrl);

    if (req.originalUrl === '/auth/validate-token' && req.body.accessToken) {
        token = req.body.accessToken;
        console.log('[District Service - requireAuth] Token encontrado no corpo para /auth/validate-token:', token ? 'sim' : 'não');
    } else {
        // Verifica se o token está no cabeçalho Authorization para outras rotas
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            console.log('[District Service - requireAuth] Token encontrado no header Authorization:', token ? 'sim' : 'não');
        } else {
            console.log('[District Service - requireAuth] Token NÃO encontrado no header Authorization.');
        }
    }

    if (!token) {
        logger.warn('Token não fornecido na requisição.');
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    try {
        console.log('[District Service - requireAuth] Tentando verificar token:', token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[District Service - requireAuth] Token verificado com sucesso. Decoded payload:', decoded);
        req.user = decoded; // Mantemos a informação do usuário decodificado na requisição
        next();
        console.log('[District Service - requireAuth] Middleware concluído, passando para o próximo.');

    } catch (err) {
        logger.error('Erro na validação do token:', err.message);
        console.error('[District Service - requireAuth] Erro na validação do token:', err);

        if (err.name === 'TokenExpiredError') {
            logger.warn('Token expirado:', err);
            return res.status(401).json({ message: 'Token expirado.' });
        }

        logger.warn('Token inválido:', err);
        return res.status(401).json({ message: 'Token inválido.' });
    }
};

const requireRole = (role) => {
    return async (req, res, next) => {
        try {
            console.log('[District Service - requireRole] Role esperada:', role);
            console.log('[District Service - requireRole] req.user:', req.user);

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