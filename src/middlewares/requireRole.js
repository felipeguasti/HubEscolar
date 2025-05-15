const requireRole = (roles) => {
    return (req, res, next) => {
        // Convert single role to array for consistent handling
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (req.user && allowedRoles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({ 
                message: 'Não autorizado: Role de acesso insuficiente' 
            });
        }
    };
};

module.exports = requireRole;