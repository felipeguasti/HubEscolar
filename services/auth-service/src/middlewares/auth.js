import jwt from 'jsonwebtoken';
import logger from '../services/logger.js';

export const authMiddleware = (req, res, next) => {
    let token = null;

    if (req.originalUrl === '/auth/validate-token' && req.body.accessToken) {
        token = req.body.accessToken;
    } else {
        // Verifica se o token está no cabeçalho Authorization para outras rotas
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        logger.warn('Token não fornecido na requisição.');
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        logger.error('Erro na validação do token:', err.message);

        if (err.name === 'TokenExpiredError') {
            logger.warn('Token expirado:', err);
            return res.status(401).json({ message: 'Token expirado.' });
        }

        logger.warn('Token inválido:', err);
        return res.status(401).json({ message: 'Token inválido.' });
    }
};

export default authMiddleware;