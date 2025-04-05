const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de 100 requisições por IP
    message: {
        error: 'Muitas requisições deste IP, por favor tente novamente mais tarde'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = limiter; 