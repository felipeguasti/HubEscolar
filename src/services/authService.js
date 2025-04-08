const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3004';

const authService = {
    async login(email, password) {
        try {
            const response = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, {
                email: email,
                password: password,
            });
            return response.data; // Espera-se que retorne accessToken e refreshToken
        } catch (error) {
            console.error('Erro ao fazer login no auth-service:', error.response ? error.response.data : error.message);
            throw error; // É importante lançar o erro para ser tratado na rota
        }
    },
    async verifyToken(accessToken) {
        try {
            const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate-token`, {
                accessToken: accessToken,
            });
            return response.data; // Espera-se que retorne informações sobre o usuário se o token for válido
        } catch (error) {
            console.error('Erro ao verificar token no auth-service:', error.response ? error.response.data : error.message);
            return null; // Ou lance o erro, dependendo do seu middleware de autenticação
        }
    },

    async refreshToken(refreshToken) {
        try {
            const response = await axios.post(`${AUTH_SERVICE_URL}/auth/refresh-token`, {
                refreshToken: refreshToken,
            });
            return response.data; // Espera-se que retorne um novo accessToken e refreshToken
        } catch (error) {
            console.error('Erro ao renovar token no auth-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getUserInfoByToken(accessToken) {
        try {
            const response = await axios.get(`${AUTH_SERVICE_URL}/auth/verify`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao obter informações do usuário pelo token no auth-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    // Outras funções relacionadas à autenticação
};

module.exports = authService;