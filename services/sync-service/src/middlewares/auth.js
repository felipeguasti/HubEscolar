const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
    try {
        logger.debug('Iniciando verificação de autenticação');
        let token = null;

        if (req.originalUrl === '/auth/validate-token' && req.body.accessToken) {
            token = req.body.accessToken;
            logger.debug('Token extraído do corpo da requisição');
        } else {
            // Verifica se o token está no cabeçalho Authorization para outras rotas
            const authHeader = req.header('Authorization');
            logger.debug(`Authorization Header recebido: ${authHeader ? 'presente' : 'ausente'}`);
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
                logger.debug(`Token extraído do cabeçalho: ${token ? token.substring(0, 10) + '...' : 'nulo'}`);
            }
        }

        if (!token) {
            logger.warn('Token não fornecido na requisição');
            return res.status(401).json({ message: 'Token não fornecido.' });
        }

        // Verificar se a variável de ambiente JWT_SECRET está definida
        if (!process.env.JWT_SECRET) {
            logger.error('JWT_SECRET não está definido nas variáveis de ambiente');
            return res.status(500).json({ message: 'Erro de configuração do servidor.' });
        }

        logger.debug('Verificando token JWT...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.debug('Token verificado com sucesso');
        
        req.user = decoded;
        next();
    } catch (err) {
        logger.error(`Erro na autenticação: ${err.message}`);
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token inválido.' });
        } else if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado.' });
        } else {
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
    }
};

module.exports = auth;