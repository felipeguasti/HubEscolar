const path = require('path');
const axios = require('axios');
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL;

// Definir o caminho base para os arquivos de mídia
const PUBLIC_PATH = path.join(__dirname, '..', 'public');

const mediaService = {

    /**
     * Get logo URLs from report service
     * @param {string} schoolId - School ID
     * @param {string} authToken - Authorization token
     * @returns {Promise<Object>} Object with processed logo URLs
     */
    async getLogosUrl(schoolId, authToken) {
        try {
            const response = await axios.get(
                `${REPORT_SERVICE_URL}/headers/${schoolId}`,
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            const header = response.data;
            return {
                schoolLogo: header.schoolLogo ? path.join(PUBLIC_PATH, header.schoolLogo) : null,
                districtLogo: header.districtLogo ? path.join(PUBLIC_PATH, header.districtLogo) : null
            };
        } catch (error) {
            console.error('Erro ao buscar URLs dos logos:', error);
            throw error;
        }
    }
};

module.exports = mediaService;