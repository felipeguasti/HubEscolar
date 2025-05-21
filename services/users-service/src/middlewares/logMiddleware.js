const logService = require('../services/logService');

// Middleware para registrar todas as requisições
const requestLogger = async (req, res, next) => {
    // Registrar o início da requisição
    const startTime = Date.now();
    
    // Armazenar o tempo de início para uso posterior
    res.locals.startTime = startTime;
    
    // Registrar informações básicas da requisição
    await logService.debug('Requisição recebida', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        userRole: req.user?.role,
        headers: {
            'user-agent': req.headers['user-agent'],
            referer: req.headers.referer
        }
    });
    
    // Capturar a resposta
    const originalSend = res.send;
    res.send = function(body) {
        const duration = Date.now() - startTime;
        res.locals.responseTime = duration;
        
        // Registrar resposta
        logService.debug('Resposta enviada', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            responseSize: body ? body.length : 0
        }).catch(console.error);
        
        originalSend.call(this, body);
        return this;
    };
    
    next();
};

// Middleware para tratamento e log de erros
const errorLogger = async (err, req, res, next) => {
    await logService.error('Erro na aplicação', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id
    });
    
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
};

module.exports = {
    requestLogger,
    errorLogger
};