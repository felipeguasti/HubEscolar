const axios = require('axios');
const logger = require('../services/logger');

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
    
    async getAllSchools(token, districtId) {
        try {
            // Validate token first
            if (!token) {
                logger.error('Token não fornecido ao buscar escolas');
                throw new Error('Token de autorização é necessário');
            }

            logger.info(`Buscando escolas${districtId ? ` para o distrito ${districtId}` : ''}`);
            logger.debug('Token recebido:', token); // Debug log to check token
            
            // Ensure token has Bearer prefix
            const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            // Prepara os parâmetros da requisição
            const requestConfig = {
                headers: {
                    'Authorization': authToken,
                    'Content-Type': 'application/json'
                }
            };

            // Adiciona o districtId aos parâmetros apenas se ele for fornecido
            if (districtId) {
                requestConfig.params = { districtId };
            }

            logger.debug('Request config:', {
                url: '/schools/list',
                headers: requestConfig.headers,
                params: requestConfig.params
            });

            const response = await this.client.get('/schools/list', requestConfig);

            logger.info(`Escolas encontradas${districtId ? ` para o distrito ${districtId}` : ''}:`, response.data);
            return response.data;

        } catch (error) {
            logger.error('Erro ao buscar escolas:', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status,
                districtId: districtId || 'não fornecido',
                token: token ? 'presente' : 'ausente'
            });
            throw new Error(`Erro ao buscar escolas: ${error.message}`);
        }
    }

    async getSchoolById(id, token) {
        try {
            logger.info(`Buscando escola com ID ${id}`);
            
            const response = await this.client.get(`/schools/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            logger.error(`Erro ao buscar escola ${id}:`, {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error(`Erro ao buscar escola: ${error.message}`);
        }
    }
}

// Exporta uma única instância do serviço
module.exports = new SchoolService();