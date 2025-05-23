const jwt = require('jsonwebtoken');
const logger = require('../services/logService');  // Assumindo que você tem um serviço de log
require('dotenv').config();

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1] || req.cookies.accessToken;
        
        // Log detalhado
        logger.debug('Autenticação iniciada', {
            path: req.path,
            method: req.method,
            hasAuthHeader: !!authHeader,
            hasToken: !!token,
            tokenLength: token ? token.length : 0
        });

        if (!token) {
            logger.warn('Tentativa de acesso sem token', {
                path: req.path,
                method: req.method,
                ip: req.ip
            });
            return res.status(401).json({ message: 'Usuário não autenticado.' });  // Consistência com sync-service
        }

        // Garantir que JWT_SECRET tenha um valor padrão se não estiver no .env
        const JWT_SECRET = process.env.JWT_SECRET || 'p({N:0X@!!Qh#<@';  // Mesmo segredo do sync-service

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                // Log detalhado do erro JWT
                logger.warn('Falha na verificação do token', {
                    error: err.name,
                    message: err.message,
                    expiredAt: err.expiredAt, // Para TokenExpiredError
                    path: req.path,
                    method: req.method
                });

                // Mensagem mais informativa sobre o erro
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ 
                        message: 'Usuário não autenticado.',
                        expired: true,
                        expiredAt: err.expiredAt
                    });
                }
                
                return res.status(401).json({ message: 'Usuário não autenticado.' });  // Consistência com sync-service
            }
            
            // Log de sucesso
            logger.debug('Autenticação bem-sucedida', {
                userId: user.id,
                role: user.role,
                path: req.path
            });
            
            req.user = user;
            next();
        });
    } catch (error) {
        // Captura erros inesperados
        logger.error('Erro no middleware de autenticação', {
            error: error.message,
            stack: error.stack,
            path: req.path
        });
        
        res.status(500).json({ message: 'Erro interno no servidor durante autenticação.' });
    }
};

module.exports = authenticate;