const jwt = require('jsonwebtoken');
require('dotenv').config();
const logger = require('../services/loggingService');
const axios = require('axios');
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

const auth = async (req, res, next) => {
    let token = null;

    if (req.originalUrl === '/auth/validate-token' && req.body.accessToken) {
        token = req.body.accessToken;
    } else {
        const authHeader = req.header('Authorization');
        console.log("Authorization Header (report-service) - Antes do split:", authHeader);
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            console.log("Token recebido (report-service) - Após o split:", token);
        }
    }

    if (!token) {
        logger.warn('Token não fornecido na requisição.');
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    try {
        // Tenta verificar o token localmente primeiro
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (localErr) {
        logger.warn('Erro na validação local do token:', localErr.message);

        try {
            const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate-token`, { accessToken: token });
            if (response.data.isValid) {
                req.user = response.data.user;
                next();
            } else {
                logger.warn('Token inválido pelo serviço de autenticação.');
                return res.status(401).json({ message: 'Token inválido.' });
            }
        } catch (authServiceErr) {
            logger.error('Erro ao comunicar com o serviço de autenticação:', authServiceErr.message);
            return res.status(500).json({ message: 'Erro ao validar o token.' });
        }
    }
};

module.exports = auth;