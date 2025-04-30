const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: (req) => {
        // Maior limite para usuários autenticados
        if (req.user) {
            return 1000; // 1000 requisições para usuários logados
        }
        return 100; // 100 requisições para não autenticados
    },
    message: (req) => ({
        error: req.user 
            ? 'Limite de requisições excedido para usuário autenticado' 
            : 'Muitas requisições deste IP, por favor tente novamente mais tarde'
    }),
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for Master users
    skip: (req) => req.user?.role === 'Master'
});

module.exports = limiter;