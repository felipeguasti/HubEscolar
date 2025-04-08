const authService = require('../services/authService');

const isAuthenticated = async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    const isAjaxRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

    if (!accessToken) {
        return isAjaxRequest
            ? res.status(401).json({ message: 'Não autenticado: Token ausente' })
            : res.redirect('/login');
    }

    try {
        const validationResponse = await authService.verifyToken(accessToken);

        if (validationResponse && validationResponse.valid) {
            req.user = { id: validationResponse.userId };
            next();
        } else {
            return isAjaxRequest
                ? res.status(401).json({ message: 'Não autenticado: Token inválido' })
                : res.redirect('/login');
        }
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        return isAjaxRequest
            ? res.status(500).json({ message: 'Erro interno ao verificar autenticação' })
            : res.redirect('/login');
    }
};

module.exports = isAuthenticated;