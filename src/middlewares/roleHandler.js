/**
 * Middleware para verificar se o usuário tem um dos papéis permitidos
 * @param {Array} allowedRoles - Array de papéis permitidos
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // Verificar se o usuário existe e tem role
        if (!req.user || !req.user.role) {
            return res.status(403).json({ 
                success: false, 
                message: 'Acesso negado: Usuário sem permissões definidas' 
            });
        }

        // Verificar se o usuário tem um dos papéis permitidos
        if (allowedRoles.includes(req.user.role)) {
            return next();
        }

        // Se chegou aqui, o usuário não tem permissão
        return res.status(403).json({ 
            success: false, 
            message: 'Acesso negado: Permissões insuficientes' 
        });
    };
};

module.exports = { checkRole };