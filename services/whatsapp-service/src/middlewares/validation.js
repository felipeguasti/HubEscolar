const logger = require('../utils/logger');

const validateMessage = (req, res, next) => {
    const { phone, message } = req.body;

    // Validar formato do telefone (aceita formato internacional +55...)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (!phone || !phoneRegex.test(phone.replace(/\D/g, ''))) {
        logger.warn('Invalid phone number format:', phone);
        return res.status(400).json({
            success: false,
            message: 'Invalid phone number format. Use international format (e.g., +5511999999999)'
        });
    }

    if (!message || message.trim().length === 0) {
        logger.warn('Empty message attempted to be sent');
        return res.status(400).json({
            success: false,
            message: 'Message cannot be empty'
        });
    }

    if (message.length > 4000) {
        logger.warn('Message exceeds maximum length');
        return res.status(400).json({
            success: false,
            message: 'Message exceeds maximum length of 4000 characters'
        });
    }

    next();
};

module.exports = {
    validateMessage
};