const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const isAuthenticated = require('../middlewares/auth');

// Rota para login (o sistema principal recebe as credenciais e chama o auth-service)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const authResponse = await authService.login(email, password);

        if (authResponse && authResponse.accessToken && authResponse.refreshToken) {
            // Configurar cookies (opções de segurança importantes!)
            res.cookie('accessToken', authResponse.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 3600000 }); // 1 hora
            res.cookie('refreshToken', authResponse.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 2592000000 }); // 30 dias

            return res.status(200).json({ message: 'Login bem-sucedido', redirectTo: '/dashboard' });
        } else if (authResponse && authResponse.message) {
            // Se o auth-service retornar uma mensagem específica de falha (ex: credenciais inválidas)
            return res.status(401).json({ message: authResponse.message });
        } else {
            return res.status(401).json({ message: 'Erro de autenticação' });
        }
    } catch (error) {
        console.error('Erro durante o login:', error);
        if (error.response) {
            // Se o erro veio do auth-service (ou outro serviço com resposta HTTP)
            return res.status(error.response.status).json(error.response.data);
        }
        // Se for um erro local ou sem resposta HTTP
        return res.status(500).json({ message: 'Erro ao fazer login', error: error.message });
    }
});

router.post('/logout', (req, res) => {
    // Limpa o cookie do accessToken
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Adicione qualquer outra lógica de invalidar sessão no backend, se necessário

    res.status(200).json({ message: 'Logout bem-sucedido', redirectTo: '/login' });
});

router.get('/me', isAuthenticated, async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const userInfo = await authService.getUserInfoByToken(accessToken);

        if (userInfo) {
            return res.status(200).json({ message: 'Usuário autenticado', user: userInfo });
        } else {
            return res.status(404).json({ message: 'Informações do usuário não encontradas' });
        }
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        return res.status(500).json({ message: 'Erro ao buscar informações do usuário' });
    }
});


// Rota para refresh token (o sistema principal recebe o refresh token e chama o auth-service)
router.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token não fornecido' });
    }

    try {
        const newTokens = await authService.refreshToken(refreshToken);
        if (newTokens && newTokens.accessToken && newTokens.refreshToken) {
            res.cookie('accessToken', newTokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 3600000 });
            res.cookie('refreshToken', newTokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 2592000000 });
            return res.status(200).json({ message: 'Tokens renovados com sucesso' });
        } else if (newTokens && newTokens.message) {
            return res.status(401).json({ message: newTokens.message });
        } else {
            return res.status(401).json({ message: 'Erro ao renovar tokens' });
        }
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        return res.status(500).json({ message: 'Erro ao renovar token', error: error.message });
    }
});

// Rota para validar um token (o sistema principal pode usar isso para verificar a validade do token armazenado)
router.post('/validate-token', async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
        return res.status(400).json({ message: 'Access token não fornecido' });
    }

    try {
        const validationResponse = await authService.verifyToken(accessToken);
        return res.status(200).json(validationResponse); // Retorna a resposta do auth-service
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return res.status(500).json({ message: 'Erro ao validar token', error: error.message });
    }
});

// Rota para verificar a autenticação (similar a validate-token)
router.get('/verify', async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        const validationResponse = await authService.verifyToken(accessToken);
        return res.status(200).json({ authenticated: validationResponse && validationResponse.valid, userId: validationResponse ? validationResponse.userId : null });
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return res.status(500).json({ message: 'Erro ao verificar autenticação', error: error.message });
    }
});

// Rota para solicitar a redefinição de senha (o sistema principal chama o auth-service)
router.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;
    try {
        const response = await authService.requestPasswordReset(email);
        return res.status(200).json({ message: response.message });
    } catch (error) {
        console.error('Erro ao solicitar redefinição de senha:', error);
        return res.status(500).json({ message: 'Erro ao solicitar redefinição de senha', error: error.message });
    }
});

// Rota para redefinir a senha (o sistema principal chama o auth-service)
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const response = await authService.resetPassword(token, password);
        return res.status(200).json({ message: response.message });
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        return res.status(500).json({ message: 'Erro ao redefinir senha', error: error.message });
    }
});

module.exports = router;