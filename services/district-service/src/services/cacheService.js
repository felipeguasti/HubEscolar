const Redis = require('ioredis');
const logger = require('../utils/logger');

class CacheService {
    constructor() {
        try {
            this.client = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                connectTimeout: 5000,
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.warn('Redis max retries reached - falling back to no cache');
                        return null; // stop retrying
                    }
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                lazyConnect: true // Don't connect immediately
            });

            // Better error handling
            this.client.on('error', (err) => {
                logger.error('Erro no Redis:', err);
            });

            this.client.on('connect', () => {
                logger.info('Conectado ao Redis com sucesso');
            });

            this.client.on('close', () => {
                logger.warn('Conexão com Redis fechada');
            });

            // Initialize connection
            this.initialize();

        } catch (error) {
            logger.error('Erro ao criar cliente Redis:', error);
            this.createMockClient();
        }
    }

    async initialize() {
        try {
            await this.client.connect();
        } catch (error) {
            logger.error('Erro ao conectar ao Redis:', error);
            this.createMockClient();
        }
    }

    createMockClient() {
        logger.warn('Usando cliente mock para cache');
        this.client = {
            get: async () => null,
            set: async () => null,
            del: async () => null,
            keys: async () => [],
            on: () => null
        };
    }

    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Erro ao obter do cache:', error);
            return null;
        }
    }

    async set(key, value, ttl = 300) {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttl);
        } catch (error) {
            logger.error('Erro ao definir no cache:', error);
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error('Erro ao deletar do cache:', error);
        }
    }

    async clearPattern(pattern) {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (error) {
            logger.error('Erro ao limpar padrão do cache:', error);
        }
    }
}

// Create and export a singleton instance
const cacheService = new CacheService();
module.exports = cacheService;