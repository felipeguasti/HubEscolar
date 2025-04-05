const axios = require('axios');

class SchoolService {
    constructor() {
        this.baseURL = process.env.NODE_ENV === 'production' 
            ? 'http://school-service:3002'
            : process.env.SCHOOL_SERVICE_URL;
            
        if (!this.baseURL) {
            throw new Error('URL do serviço de escolas não está definida');
        }
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 5000
        });
    }

    async getAllSchools() {
        try {
            const response = await this.client.get('/api/schools');
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar escolas:', error.message);
            throw error;
        }
    }

    async getSchoolById(id) {
        try {
            const response = await this.client.get(`/api/schools/${id}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar escola:', error.message);
            throw error;
        }
    }
}

module.exports = new SchoolService(); 