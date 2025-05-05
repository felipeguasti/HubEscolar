const path = require('path');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

module.exports = {
  'config': path.resolve('src/config', 'database.js'),
  'models-path': path.resolve('src', 'models'),
  'seeders-path': path.resolve('src', 'seeders'),
  'migrations-path': path.resolve('src', 'migrations')
};

const commands = {
    async status() {
        try {
            const status = await whatsappService.getStatus();
            console.log('WhatsApp Status:', status);
        } catch (error) {
            logger.error('Error getting status:', error);
        }
    },

    async init() {
        try {
            await whatsappService.initialize();
            console.log('WhatsApp service initialized');
        } catch (error) {
            logger.error('Error initializing service:', error);
        }
    },

    help() {
        console.log(`
Available commands:
    status  - Check WhatsApp connection status
    init    - Initialize WhatsApp service
    help    - Show this help message
        `);
    }
};

const command = process.argv[2] || 'help';

if (commands[command]) {
    commands[command]();
} else {
    console.log('Unknown command. Use "help" to see available commands.');
}