const axios = require('axios');
const authService = require('./authService'); // Se precisar do token para algumas chamadas

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3001'; // Defina a URL no .env

const usersService = {
    async createUser(userData, accessToken) {
        try {
            const response = await axios.post(`${USERS_SERVICE_URL}/users`, userData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`, // Envie o token se necessário
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao criar usuário no users-service:', error.response ? error.response.data : error.message);
            throw error; // Rejogue o erro para ser tratado na rota
        }
    },

    async getUserById(userId, accessToken) {
        try {
            const response = await axios.get(`${USERS_SERVICE_URL}/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar usuário no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
        // Outras funções para interagir com o users-service
    },
};

module.exports = usersService;