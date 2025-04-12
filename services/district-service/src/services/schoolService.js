const axios = require('axios');
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';

class SchoolService {
    constructor(cacheService) {
        this.baseURL = process.env.NODE_ENV === 'production'
            ? 'http://localhost:3002'
            : process.env.SCHOOL_SERVICE_URL;
    
        if (!this.baseURL) {
            throw new Error('URL do serviço de escolas não está definida');
        }
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 5000
        });
        this.cacheService = cacheService;
    }
    
    
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
    }
    

    async getSchoolById(id) {
        try {
            const response = await this.client.get(`/schools/${id}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar escola:', error.message);
            throw error;
        }
    }
}

module.exports = new SchoolService(); 