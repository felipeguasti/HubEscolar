import winston from 'winston';

const logger = winston.createLogger({
    level: 'info', 
    format: winston.format.json(),
    defaultMeta: { service: 'auth-service' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// Em ambiente de desenvolvimento, também logar no console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

export default logger;