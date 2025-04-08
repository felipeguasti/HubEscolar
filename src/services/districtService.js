const axios = require('axios');

const DISTRICT_SERVICE_URL = process.env.DISTRICT_SERVICE_URL || 'http://localhost:3002';

const districtService = {
    async getDistrictById(districtId, accessToken) {
        try {
            const response = await axios.get(`${DISTRICT_SERVICE_URL}/districts/${districtId}`, {
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
    // Outras funções para interagir com o district-service
};

module.exports = districtService;