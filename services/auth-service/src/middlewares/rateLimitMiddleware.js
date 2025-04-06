const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Limitar cada IP a 5 tentativas de login por janela
    message: 'Muitas tentativas de login. Por favor, tente novamente após 15 minutos.',
    statusCode: 429, // Código de status para "Too Many Requests"
    headers: true, // Retornar informações de rate limit nos headers
});

module.exports = { loginLimiter };