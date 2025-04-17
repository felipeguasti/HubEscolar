const axios = require('axios');
require('dotenv').config();
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3001';

const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
    ],
});

const usersService = {
    async getUserByEmail(email, accessToken) {
        try {
            const response = await axios.get(`${USERS_SERVICE_URL}/users/email/${email}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error('Erro ao buscar usuário por email no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async createUser(userData, accessToken) {
        try {
            const response = await axios.post(`${USERS_SERVICE_URL}/users/create`, userData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error('Erro ao criar usuário no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getAllUsers(accessToken) {
        try {
            const response = await axios.get(`${USERS_SERVICE_URL}/users/filter`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error('Erro ao listar usuários no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async updateUser(id, userData, accessToken) {
        try {
            const response = await axios.put(`${USERS_SERVICE_URL}/users/edit/${id}`, userData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error(`Erro ao atualizar usuário ${id} no users-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async deleteUser(id, accessToken) {
        try {
            const response = await axios.delete(`${USERS_SERVICE_URL}/users/delete/${id}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error(`Erro ao deletar usuário ${id} no users-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getUserById(id, accessToken) {
        try {
            const response = await axios.get(`${USERS_SERVICE_URL}/users/list/${id}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error(`Erro ao buscar usuário ${id} no users-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getUsers(accessToken, query) {
        try {
            const response = await axios.get(`${USERS_SERVICE_URL}/users/list`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: query,
            });
            return response.data;
        } catch (error) {
            logger.error(`Erro ao buscar usuários no users-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getLoggedInUser(accessToken) {
        try {
            const response = await axios.get(`${AUTH_SERVICE_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error('Erro ao buscar usuário logado no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async resetPassword(id, passwordData, accessToken) {
        try {
            const response = await axios.post(
                `${USERS_SERVICE_URL}/users/reset-password`,
                { userId: id, ...passwordData },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                }
            );
            return response.data;
        } catch (error) {
            logger.error('Erro ao resetar senha no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async filterUsers(filters, accessToken) {
        try {
            const response = await axios.get(`${USERS_SERVICE_URL}/users/filter`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: filters,
            });
            return response.data;
        } catch (error) {
            logger.error('Erro ao filtrar usuários no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getUsersData(accessToken) {
        try {
            const response = await axios.get(`${USERS_SERVICE_URL}/users/data`, { 
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            logger.error('Erro ao buscar dados de usuários no users-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },
};

module.exports = usersService;