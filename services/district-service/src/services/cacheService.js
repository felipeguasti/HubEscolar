const Redis = require('ioredis');
const logger = require('../utils/logger');

class CacheService {
    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.client.on('error', (err) => {
            logger.error('Erro no Redis:', err);
        });
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

module.exports = new CacheService(); 