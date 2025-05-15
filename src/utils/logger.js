const winston = require('winston');
const path = require('path');

// Custom format with message filtering
const customFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
        // Skip Chrome DevTools related messages
        if (typeof message === 'string' && 
            message.includes('/.well-known/appspecific/com.chrome.devtools.json')) {
            return null;
        }
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

// Define log files path
const logDir = path.join(__dirname, '../logs');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        // Add custom filter
        winston.format(info => {
            if (info.message && 
                info.message.includes('/.well-known/appspecific/com.chrome.devtools.json')) {
                return false;
            }
            return info;
        })(),
        customFormat
    ),
    transports: [
        // Console transport (always enabled)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                customFormat
            )
        }),
        // File transports
        new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],
    exitOnError: false
});

// Add error handling for the logger itself
logger.on('error', (error) => {
    console.error('Logging error:', error);
});

// Ensure log directory exists
const fs = require('fs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Export logger methods individually for better IDE support
module.exports = {
    info: (message) => logger.info(message),
    error: (message, error) => logger.error(`${message} ${error ? `- ${error.message || error}` : ''}`),
    warn: (message) => logger.warn(message),
    debug: (message) => logger.debug(message)
};