const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carregue as variáveis de ambiente

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token de autenticação inválido.' });
        }
        req.user = user; // Armazena as informações do usuário decodificadas no req.user
        next();
    });
};

module.exports = authenticate;