const axios = require('axios');

class UserService {
    constructor() {
        this.baseURL = process.env.NODE_ENV === 'production'
            ? 'http://users-service:3001'
            : 'http://localhost:3001';
            
        if (!this.baseURL) {
            throw new Error('URL do serviço de usuários não está definida');
        }
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 5000
        });
    }

    async getUserById(id) {
        try {
            const response = await this.client.get(`/users/filter${id}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error.message);
            throw error;
        }
    }

    async getUsersByDistrict(districtId) {
        try {
            const response = await this.client.get(`/users/filter?districtId=${districtId}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar usuários do distrito:', error.message);
            throw error;
        }
    }
}

module.exports = new UserService(); 