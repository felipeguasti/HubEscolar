const axios = require('axios');
const loggingService = require('./loggingService');

const usersServiceBaseUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3001';

async function fetchUser(userId, accessToken) {
    try {
        const response = await axios.get(`${usersServiceBaseUrl}/users/list/${userId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error) {
        loggingService.error(`Erro ao buscar usuário com ID ${userId} no serviço de usuários:`, error.message);
        if (error.response && error.response.status === 404) {
            return null; // Usuário não encontrado
        }
        throw new Error(`Falha ao buscar usuário com ID ${userId} no serviço de usuários.`);
    }
}

async function verifyStudentRole(userId, accessToken) {
    try {
        const user = await fetchUser(userId, accessToken);
        if (!user) {
            return { success: false, error: `Usuário com ID ${userId} não encontrado no serviço de usuários.` };
        }
        if (user.role !== 'Aluno') {
            return { success: false, error: `O usuário com ID ${userId} no serviço de usuários não é um aluno.` };
        }
        return { success: true, data: user };
    } catch (error) {
        console.error(`Erro ao verificar role de aluno para o ID ${userId}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function isStudent(userId, accessToken) {
    try {
        const user = await fetchUser(userId, accessToken);
        return user && user.role === 'Aluno';
    } catch (error) {
        loggingService.error(`Erro ao verificar role de aluno para o ID ${userId}:`, error.message);
        throw new Error(`Falha ao verificar role de aluno para o ID ${userId} no serviço de usuários.`);
    }
}

module.exports = { verifyStudentRole, fetchUser, isStudent };