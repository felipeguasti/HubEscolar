const axios = require('axios');

class AuthService {
    constructor() {
        this.baseURL = process.env.NODE_ENV === 'production'
            ? 'http://auth-service:3004'
            : 'http://localhost:3004';
            
        if (!this.baseURL) {
            throw new Error('URL do serviço de autenticação não está definida');
        }
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 5000
        });
    }

    async verifyToken(token) {
        try {
            const response = await this.client.post('/api/auth/verify', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error('Token inválido ou expirado');
        }
    }

    async checkPermission(token, requiredRole) {
        try {
            const response = await this.client.post('/api/auth/check-permission', {
                role: requiredRole
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.hasPermission;
        } catch (error) {
            throw new Error('Erro ao verificar permissão');
        }
    }
}

module.exports = new AuthService(); 