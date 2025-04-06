// middlewares/auth.js (adaptado para auth-service)

const jwt = require('jsonwebtoken');
const logger = require('../services/logger'); // Importe o logger

const authMiddleware = (req, res, next) => {
    let token = null;

    // Verifica se o token está no cabeçalho Authorization
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        logger.warn('Token não fornecido na requisição.');
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Mantemos a informação do usuário decodificado na requisição
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

module.exports = authMiddleware;