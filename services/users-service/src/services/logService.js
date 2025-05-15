const winston = require('winston');
const axios = require('axios');
const Log = require('../models/Log');
const { Op } = require('sequelize');
require('dotenv').config();

class LogService {
    constructor() {
        // Configuração do logger local
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: `${process.env.LOG_DIR || 'logs'}/error.log`, 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: `${process.env.LOG_DIR || 'logs'}/combined.log` 
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });

        // URL do serviço principal para envio de logs
        this.mainServiceUrl = process.env.MAIN_SERVICE_URL || 'http://localhost:3000';
    }

    // Formato padrão para logs
    formatLog(level, message, metadata = {}) {
        return {
            timestamp: new Date(),
            service: 'users-service',
            level,
            message,
            ...metadata
        };
    }

    // Envia log para o serviço principal
    async sendToMainService(log) {
        // try {
        //     await axios.post(`${this.mainServiceUrl}/api/logs`, log);
        // } catch (error) {
        //     // Se falhar, apenas registra localmente
        //     this.logger.error('Falha ao enviar log para o serviço principal', { error: error.message });
        // }
    }

    // Salva log no banco de dados
    async saveToDatabase(log) {
        try {
            await Log.create(log);
        } catch (error) {
            this.logger.error('Falha ao salvar log no banco de dados', { error: error.message });
        }
    }

    // Log de informação
    async info(message, metadata = {}) {
        const log = this.formatLog('info', message, metadata);
        this.logger.info(message, metadata);
        await Promise.all([
            this.sendToMainService(log),
            this.saveToDatabase(log)
        ]);
    }

    // Log de erro
    async error(message, metadata = {}) {
        const log = this.formatLog('error', message, metadata);
        this.logger.error(message, metadata);
        await Promise.all([
            this.sendToMainService(log),
            this.saveToDatabase(log)
        ]);
    }

    // Log de aviso
    async warn(message, metadata = {}) {
        const log = this.formatLog('warn', message, metadata);
        this.logger.warn(message, metadata);
        await Promise.all([
            this.sendToMainService(log),
            this.saveToDatabase(log)
        ]);
    }

    // Log de debug (apenas local e banco)
    async debug(message, metadata = {}) {
        const log = this.formatLog('debug', message, metadata);
        this.logger.debug(message, metadata);
        await this.saveToDatabase(log);
    }

    // Log de operações de usuário
    async logUserOperation(operation, userId, metadata = {}) {
        const message = `Operação de usuário: ${operation}`;
        const log = this.formatLog('info', message, {
            operation,
            userId,
            ...metadata
        });
        
        this.logger.info(message, { operation, userId, ...metadata });
        await Promise.all([
            this.sendToMainService(log),
            this.saveToDatabase(log)
        ]);
    }

    // Log de tentativas de login
    async logLoginAttempt(email, success, metadata = {}) {
        const message = `Tentativa de login ${success ? 'bem-sucedida' : 'falhou'}`;
        const log = this.formatLog(success ? 'info' : 'warn', message, {
            email,
            success,
            ...metadata
        });
        
        this.logger[success ? 'info' : 'warn'](message, { email, success, ...metadata });
        await Promise.all([
            this.sendToMainService(log),
            this.saveToDatabase(log)
        ]);
    }

    // Consulta logs
    async getLogs(filters = {}) {
        const where = {};
        
        if (filters.level) where.level = filters.level;
        if (filters.userId) where.userId = filters.userId;
        if (filters.operation) where.operation = filters.operation;
        if (filters.startDate && filters.endDate) {
            where.timestamp = {
                [Op.between]: [filters.startDate, filters.endDate]
            };
        }

        return await Log.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: filters.limit || 100
        });
    }
}

module.exports = new LogService(); 