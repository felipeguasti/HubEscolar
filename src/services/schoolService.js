const axios = require('axios');

const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3003';

const schoolService = {
    async getSchoolById(schoolId, accessToken) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/schools/${schoolId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar escola no school-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getAllSchools(accessToken) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/schools`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar todas as escolas no school-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    // Outras funções para interagir com o school-service (criar, atualizar, deletar, etc.)
};

module.exports = schoolService;