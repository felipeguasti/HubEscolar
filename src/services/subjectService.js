const axios = require('axios');
require('dotenv').config();
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';

const subjectService = {
    async getAllSubjects(accessToken) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/subjects/list`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao buscar matérias no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async searchSubjects(accessToken, name) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/subjects/search?name=${name}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao pesquisar matérias no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getSubjectById(accessToken, subjectId) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/subjects/list/${subjectId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao buscar matéria por ID no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async createSubject(accessToken, subjectData) {
        try {
            const response = await axios.post(`${SCHOOL_SERVICE_URL}/subjects/create`, subjectData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao criar matéria no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async updateSubject(accessToken, subjectId, subjectData) {
        try {
            const response = await axios.put(`${SCHOOL_SERVICE_URL}/subjects/edit/${subjectId}`, subjectData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao atualizar matéria no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async updateSubjectStatus(accessToken, subjectId, active) {
        try {
            const response = await axios.patch(`${SCHOOL_SERVICE_URL}/subjects/edit/${subjectId}/status`, 
                { active },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error("Erro ao atualizar status da matéria no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async deleteSubject(accessToken, subjectId) {
        try {
            await axios.delete(`${SCHOOL_SERVICE_URL}/subjects/delete/${subjectId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return true;
        } catch (error) {
            console.error("Erro ao excluir matéria no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    }
};

module.exports = subjectService;