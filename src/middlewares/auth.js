const authService = require('../services/authService');
const usersService = require('../services/usersService'); // Importe o seu usersService

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

        if (validationResponse && validationResponse.valid && validationResponse.userId) {
            const userId = validationResponse.userId;
            try {
                // Buscar os detalhes completos do usuário usando o usersService
                const userDetails = await usersService.getUserById(userId, accessToken);

                if (userDetails) {
                    // Excluir a senha antes de popular req.user
                    const { password, ...userWithoutPassword } = userDetails;
                    req.user = userWithoutPassword;
                    next();
                } else {
                    return isAjaxRequest
                        ? res.status(401).json({ message: 'Não autenticado: Usuário não encontrado' })
                        : res.redirect('/login');
                }
            } catch (error) {
                return isAjaxRequest
                    ? res.status(500).json({ message: 'Erro ao buscar detalhes do usuário' })
                    : res.redirect('/login');
            }
        } else {
            return isAjaxRequest
                ? res.status(401).json({ message: 'Não autenticado: Token inválido' })
                : res.redirect('/login');
        }
    } catch (error) {
        console.error('[AUTH MIDDLEWARE] Erro ao verificar token:', error);
        return isAjaxRequest
            ? res.status(500).json({ message: 'Erro interno ao verificar autenticação' })
            : res.redirect('/login');
    }
};

module.exports = isAuthenticated;