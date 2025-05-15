const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const logger = require('../services/loggingService');

const auth = async (req, res, next) => {
    let token = null;

    if (req.originalUrl === '/auth/validate-token' && req.body.accessToken) {
        token = req.body.accessToken;
    } else {
        // Verifica se o token está no cabeçalho Authorization para outras rotas
        const authHeader = req.header('Authorization');
        console.log("Authorization Header (school-service) - Antes do split:", authHeader); // ADICIONE ESTE LOG
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            console.log("Token recebido (school-service) - Após o split:", token); // ADICIONE ESTE LOG
        }
    }

    if (!token) {
        logger.warn('Token não fornecido na requisição.');
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token decodificado (school-service):", decoded);
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

module.exports = auth;