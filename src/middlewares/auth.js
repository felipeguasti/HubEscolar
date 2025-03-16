const jwt = require('jsonwebtoken');

// Função auxiliar para enviar resposta de erro
const handleError = (res, statusCode, message) => {
  return res.status(statusCode).json({ message });
};

// Middleware para verificar o token JWT e papéis de usuários
const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    let token = null;

    // Verifica se o token está no cabeçalho Authorization
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Se não estiver no cabeçalho, tenta pegar dos cookies
      token = req.cookies.token;
    }

    if (!token) {
      console.error('Token não fornecido.');
      return res.redirect('/login');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (allowedRoles.length === 0) {
        return next();
      }

      if (!allowedRoles.includes(req.user.role)) {
        console.error(`Permissão insuficiente para o papel: ${req.user.role}`);
        return res.redirect('/login'); 
      }

      next();

    } catch (err) {
      console.error('Erro na validação do token:', err.message);

      if (err.name === 'TokenExpiredError') {
        console.error('Token expirado:', err);
        return res.redirect('/login');
      }

      console.error('Token inválido:', err);
      return res.redirect('/login');
    }
  };
};

module.exports = authMiddleware;
