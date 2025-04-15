const axios = require('axios');
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';

const gradeService = {
    async getGradeById(gradeId, accessToken) {
        try {
            const response = await axios.get(`${SCHOOL_SERVICE_URL}/grades/${gradeId}`, {
                headers: {
                Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error("Erro ao buscar turma por ID no school-service:", error.response ? error.response.data : error.message);
            res.status(500).json({ error: "Erro ao buscar turma" });
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

    async createGrade(gradeData, accessToken) {
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

    async updateGrade(gradeId, gradeData, accessToken) {
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
};

module.exports = gradeService;