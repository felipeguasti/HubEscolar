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
            try {
                // Buscar os detalhes completos do usuário usando o usersService
                const userDetails = await usersService.getUserById(validationResponse.userId, accessToken);

                if (userDetails) {
                    req.user = {
                        id: userDetails.id,
                        role: userDetails.role, // Anexar a role do usuário
                        // Adicione outras informações relevantes do usuário aqui, se necessário
                    };
                    next();
                } else {
                    return isAjaxRequest
                        ? res.status(401).json({ message: 'Não autenticado: Usuário não encontrado' })
                        : res.redirect('/login');
                }
            } catch (error) {
                console.error('Erro ao buscar detalhes do usuário:', error);
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
        console.error('Erro ao verificar token:', error);
        return isAjaxRequest
            ? res.status(500).json({ message: 'Erro interno ao verificar autenticação' })
            : res.redirect('/login');
    }
};

module.exports = isAuthenticated;