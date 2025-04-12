const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            return res.status(403).json({ message: 'Não autorizado: Role de acesso insuficiente' });
        }
    };
};

module.exports = requireRole;