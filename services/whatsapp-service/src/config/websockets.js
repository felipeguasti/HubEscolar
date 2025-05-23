const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws'
        });
        this.clients = new Map();
        
        this.init();
    }
    
    init() {
        this.wss.on('connection', (ws) => {
            logger.info('New websocket connection established');
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    
                    // Registrar interesse em status de mensagens específicas
                    if (data.type === 'subscribe' && data.messageIds && Array.isArray(data.messageIds)) {
                        data.messageIds.forEach(messageId => {
                            if (!this.clients.has(messageId)) {
                                this.clients.set(messageId, new Set());
                            }
                            this.clients.get(messageId).add(ws);
                            logger.info(`Client subscribed to message ${messageId}`);
                        });
                        
                        ws.send(JSON.stringify({
                            type: 'subscribed',
                            messageIds: data.messageIds
                        }));
                    }
                } catch (error) {
                    logger.error('Error handling websocket message:', error);
                }
            });
            
            ws.on('close', () => {
                // Limpar conexões quando cliente desconecta
                for (const [messageId, clients] of this.clients.entries()) {
                    clients.delete(ws);
                    if (clients.size === 0) {
                        this.clients.delete(messageId);
                    }
                }
            });
        });
    }
    
    // Notificar clientes interessados quando status mudar
    notifyStatusChange(messageId, status) {
        if (!this.clients.has(messageId)) return;
        
        const notification = JSON.stringify({
            type: 'status_update',
            messageId,
            status,
            timestamp: new Date().toISOString()
        });
        
        this.clients.get(messageId).forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(notification);
            }
        });
        
        logger.info(`Notified ${this.clients.get(messageId).size} clients about status change for message ${messageId}`);
    }
}

let instance = null;

module.exports = {
    initialize: (server) => {
        instance = new WebSocketServer(server);
        return instance;
    },
    getInstance: () => instance
};