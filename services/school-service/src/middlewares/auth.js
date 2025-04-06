const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token de autenticação inválido.' });
        }
        req.user = user;
        next();
    });
};

module.exports = auth;