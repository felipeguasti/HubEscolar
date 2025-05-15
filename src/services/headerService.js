const axios = require('axios');
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL;

/**
 * Header service for managing report headers
 * @typedef {Object} HeaderData
 * @property {number} schoolId - School ID
 * @property {number} districtId - District ID
 * @property {string} [schoolLogo] - Path to school logo
 * @property {string} [districtLogo] - Path to district logo
 * @property {string} [line1] - First line of header
 * @property {string} [line2] - Second line of header
 */

const headerService = {
    // Get header by school ID
    async getHeader(accessToken, schoolId) {
        try {
            const response = await axios.get(
                `${REPORT_SERVICE_URL}/headers/${schoolId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar cabeçalho:', error);
            throw error;
        }
    },

    /**
     * Updates or creates a header
     * @param {string} accessToken - JWT access token
     * @param {HeaderData} headerData - Header data to update
     */
    async updateHeader(accessToken, headerData) {
        try {
            const response = await axios.post(
                `${REPORT_SERVICE_URL}/headers/update`,
                headerData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Erro ao atualizar cabeçalho:', error);
            throw error;
        }
    },

    // Upload logo (school or district)
    async uploadLogo(accessToken, schoolId, logoType, file) {
        try {
            const formData = new FormData();
            formData.append('logo', file);
            formData.append('schoolId', schoolId);
            formData.append('logoType', logoType);

            const response = await axios.post(
                `${REPORT_SERVICE_URL}/headers/upload-logo`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Erro ao fazer upload de logo:', error);
            throw error;
        }
    },

    // Delete header
    async deleteHeader(accessToken, schoolId) {
        try {
            const response = await axios.delete(
                `${REPORT_SERVICE_URL}/headers/delete/${schoolId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Erro ao deletar cabeçalho:', error);
            throw error;
        }
    },

    // List all headers (for admin purposes)
    async listHeaders(accessToken) {
        try {
            const response = await axios.get(
                `${REPORT_SERVICE_URL}/headers/list`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Erro ao listar cabeçalhos:', error);
            throw error;
        }
    }
};

module.exports = headerService;