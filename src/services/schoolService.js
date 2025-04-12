const axios = require('axios');
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';

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

    // No seu schoolService.js (no HubEscolar)
    async getAllSchools(accessToken, districtId) {
        try {
            const params = {};
            if (districtId) {
                params.districtId = districtId;
            }
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/schools/list`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: params,
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar todas as escolas no school-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async createSchool(schoolData, accessToken) {
        try {
            const response = await axios.post(`${SCHOOL_SERVICE_URL}/schools/create`, schoolData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao criar escola no school-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async updateSchool(schoolId, schoolData, accessToken) {
        try {
            const response = await axios.put(`${SCHOOL_SERVICE_URL}/schools/edit/${schoolId}`, schoolData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao atualizar escola ${schoolId} no school-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async deleteSchool(schoolId, accessToken) {
        try {

            const response = await axios.delete(`${SCHOOL_SERVICE_URL}/schools/delete/${schoolId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao deletar escola ${schoolId} no school-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },
};

module.exports = schoolService;