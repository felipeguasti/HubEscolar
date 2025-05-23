import rateLimit from 'express-rate-limit';

// Middleware de rate limit para rotas gerais (após autenticação)
export const apiLimiter = (req, res, next) => {
    // Verificar se é usuário Master ou Coordenador
    if (req.user && (req.user.role === 'Master' || req.user.role === 'Coordenador')) {
        // Usuários Master e Coordenador estão isentos do rate limit
        console.log(`Ignorando rate limit para usuário ${req.user.role}: ${req.user.email || req.user.username}`);
        return next();
    }

    // Aplicar rate limit para outros usuários
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: req.user ? 1000 : 100, // 1000 para autenticados, 100 para não autenticados
        message: {
            error: req.user 
                ? 'Limite de requisições excedido para usuário autenticado' 
                : 'Muitas requisições deste IP, por favor tente novamente mais tarde'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false
    });

    // Aplicar o limitador a esta requisição
    return limiter(req, res, next);
};

// Middleware de rate limit específico para login (já existente)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas de login
    message: {
        error: 'Muitas tentativas de login. Por favor, tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
});