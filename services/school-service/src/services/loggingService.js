const winston = require('winston');
const { format } = winston;

const logger = winston.createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4
    },
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack, ...metadata }) => {
            let log = `${timestamp} | ${level.toUpperCase()} | `;
            
            if (level === 'error') {
                log += `Error: ${message}`;
                if (stack) {
                    const formattedStack = stack
                        .split('\n')
                        .map(line => '    ' + line.trim())
                        .join('\n');
                    log += `\nStack Trace:\n${formattedStack}`;
                }
            } else {
                log += message;
            }

            if (Object.keys(metadata).length > 0) {
                log += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
            }

            return log;
        })
    ),
    transports: [
        new winston.transports.Console({
            level: 'http'
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            level: 'http',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

module.exports = {
    error: (message, error) => {
        logger.error({
            message: typeof message === 'string' ? message : 'Um erro ocorreu',
            error: error instanceof Error ? error : new Error(JSON.stringify(error))
        });
    },
    warn: (message, metadata = {}) => {
        logger.warn(message, metadata);
    },
    info: (message, metadata = {}) => {
        logger.info(message, metadata);
    },
    http: (message, metadata = {}) => {
        logger.http(message, metadata);
    },
    debug: (message, metadata = {}) => {
        logger.debug(message, metadata);
    }
};