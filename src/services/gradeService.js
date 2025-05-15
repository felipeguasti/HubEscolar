const axios = require('axios');
require('dotenv').config();
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';

const gradeService = {
    async getGradeById(accessToken, gradeId) { // invertido para manter padrão
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/grades/${gradeId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao buscar turma por ID no school-service:", error.response ? error.response.data : error.message);
            throw error;
        }
    },

    // No seu schoolService.js (no HubEscolar)
    async getAllGrades(accessToken, schoolId) {
        try {
            const params = {};
            if (schoolId) {
                params.schoolId = schoolId;
            }
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/grades/list`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: params,
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar todas as turmas no school-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async createGrade(accessToken, gradeData) {
        try {
            const response = await axios.post(`${SCHOOL_SERVICE_URL}/grades/create`, gradeData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao criar Turma no school-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async updateGrade(accessToken, gradeId, gradeData) {
        try {
            const response = await axios.put(`${SCHOOL_SERVICE_URL}/grades/edit/${gradeId}`, gradeData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao atualizar escola ${gradeId} no school-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async deleteGrade(gradeId, accessToken) {
        try {

            const response = await axios.delete(`${SCHOOL_SERVICE_URL}/grades/delete/${gradeId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao deletar turma ${gradeId} no school-service:`, error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getGradesBySchool(accessToken, schoolId) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/grades/school/${schoolId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao buscar turmas por escola:", error.response?.data || error.message);
            throw error;
        }
    },

    async getGradesByDistrict(accessToken, districtId) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/grades/district/${districtId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao buscar turmas por distrito:", error.response?.data || error.message);
            throw error;
        }
    }
};

module.exports = gradeService;