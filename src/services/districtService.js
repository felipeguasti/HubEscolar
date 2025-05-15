// Em D:\Documents\GitHub\hubescolar\src\services\districtService.js
const axios = require('axios');
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas

const DISTRICT_SERVICE_URL = process.env.DISTRICT_SERVICE_URL || 'http://localhost:3003';

const districtService = {
    async getDistrictById(districtId, accessToken) {
        try {
            const url = `${DISTRICT_SERVICE_URL}/districts/${districtId}`;
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar distrito no district-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async getAllDistricts(accessToken, page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc') {
        try {
            const response = await axios.get(`${DISTRICT_SERVICE_URL}/districts`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: {
                    page,
                    limit,
                    sortBy,
                    sortOrder,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao listar distritos no district-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async createDistrict(districtData, accessToken) {
        try {
            const response = await axios.post(`${DISTRICT_SERVICE_URL}/districts/create`, districtData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao criar distrito no district-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async updateDistrict(districtId, districtData, accessToken) {
        try {
            const response = await axios.put(`${DISTRICT_SERVICE_URL}/districts/edit/${districtId}`, districtData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao atualizar distrito no district-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    async deleteDistrict(districtId, accessToken) {
        try {
            const response = await axios.delete(`<span class="math-inline">\{DISTRICT\_SERVICE\_URL\}/districts/delete/</span>{districtId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao deletar distrito no district-service:', error.response ? error.response.data : error.message);
            throw error;
        }
    },
    // Outras funções conforme necessário
};

module.exports = districtService;