const axios = require('axios');
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3004';
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3001';

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
            const validationResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/validate-token`, {
                accessToken: accessToken
            });
    
            if (validationResponse.data.valid && validationResponse.data.userId) {
                const userId = validationResponse.data.userId;
                try {
                    const userDetailsResponse = await axios.get(`${USERS_SERVICE_URL}/users/list/${userId}`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    });
                    return userDetailsResponse.data;
                } catch (error) {
                    console.error('Erro ao buscar detalhes do usuário no users-service:', error.response ? error.response.data : error.message);
                    throw error;
                }
            }
    
            return validationResponse.data; // Retorna a resposta básica em caso de falha na busca dos detalhes
        } catch (error) {
            console.error('Erro ao obter informações do usuário pelo token no auth-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    // Outras funções relacionadas à autenticação
};

module.exports = authService;