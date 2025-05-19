// No seu JavaScript do frontend
class MessageTracker {
    constructor() {
        this.messages = new Map(); // messageId -> dados da mensagem
        this.socket = null;
        this.statusCallbacks = new Map(); // messageId -> função de callback
    }
    
    connectSocket() {
        // Conectar ao WebSocket se disponível
        const wsUrl = `ws://${window.location.host.replace('3000', '3006')}/ws`;
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            // Re-subscrever nas mensagens que estamos monitorando
            if (this.messages.size > 0) {
                const messageIds = Array.from(this.messages.keys());
                this.subscribeToStatus(messageIds);
            }
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'status_update' && data.messageId) {
                    // Atualizar status localmente
                    if (this.messages.has(data.messageId)) {
                        const message = this.messages.get(data.messageId);
                        message.status = data.status;
                        message.updatedAt = data.timestamp;
                        
                        // Chamar callback se registrado
                        if (this.statusCallbacks.has(data.messageId)) {
                            this.statusCallbacks.get(data.messageId)(data.status, message);
                        }
                        
                        // Atualizar UI se necessário
                        this.updateMessageUI(data.messageId, data.status);
                    }
                }
            } catch (error) {
                console.error('Error handling websocket message:', error);
            }
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket connection closed');
            // Tentar reconectar após um tempo
            setTimeout(() => this.connectSocket(), 5000);
        };
    }
    
    // Método para enviar mensagem e começar a monitorar
    async sendMessage(phone, message, options = {}) {
        try {
            // Limpar e formatar o número de telefone corretamente
            let cleanPhone = phone.replace(/\D/g, '');
            
            // Verificar se o número já começa com 55 (Brasil)
            if (!cleanPhone.startsWith('55')) {
                // Se não começa com 55, adicionar o prefixo do Brasil
                cleanPhone = '55' + cleanPhone;
                console.log(`Adicionando código do país: ${cleanPhone}`);
            }
            
            // Verificar se o número tem pelo menos 12 dígitos (55 + DDD + número)
            if (cleanPhone.length < 12) {
                throw new Error(`Número de telefone inválido ou incompleto: ${phone}`);
            }
            
            console.log(`Enviando mensagem para: ${cleanPhone}`, options);
            
            const response = await fetch('/whatsapp/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: cleanPhone,
                    message,
                    ...options
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao enviar mensagem');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Erro ao enviar mensagem');
            }
            
            console.log('Mensagem enviada com sucesso:', data);
            
            return {
                success: true,
                messageId: data.messageId
            };
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw error;
        }
    }
    
    // Subscrever para atualizações de status via WebSocket
    subscribeToStatus(messageIds) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'subscribe',
                messageIds
            }));
        }
    }
    
    // Polling para status (fallback se WebSockets não estiver disponível)
    startStatusPolling(messageId, interval = 5000, maxAttempts = 12) {
        let attempts = 0;
        
        const checkStatus = async () => {
            try {
                attempts++;
                const status = await this.checkMessageStatus(messageId);
                
                // Parar de verificar quando atingir status final ou máximo de tentativas
                if (['read', 'failed'].includes(status) || attempts >= maxAttempts) {
                    return;
                }
                
                // Continuar verificando
                setTimeout(checkStatus, interval);
            } catch (error) {
                console.error(`Error checking status for message ${messageId}:`, error);
            }
        };
        
        // Iniciar verificação após um curto atraso
        setTimeout(checkStatus, 2000);
    }
    
    // Verificar status de uma mensagem
    async checkMessageStatus(messageId) {
        try {
            const response = await fetch(`/whatsapp/messages/status/${messageId}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                const status = data.data.status;
                
                // Atualizar localmente
                if (this.messages.has(messageId)) {
                    this.messages.get(messageId).status = status;
                    this.updateMessageUI(messageId, status);
                    
                    // Chamar callback se registrado
                    if (this.statusCallbacks.has(messageId)) {
                        this.statusCallbacks.get(messageId)(status, this.messages.get(messageId));
                    }
                }
                
                return status;
            }
            
            return 'unknown';
        } catch (error) {
            console.error(`Error checking message status for ${messageId}:`, error);
            return 'error';
        }
    }
    
    // Registrar um callback para quando o status mudar
    onStatusChange(messageId, callback) {
        this.statusCallbacks.set(messageId, callback);
    }
    
    // Atualizar UI com novo status
    updateMessageUI(messageId, status) {
        // Encontrar elemento da mensagem no DOM
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            // Remover classes de status anteriores
            messageElement.classList.remove('status-sent', 'status-delivered', 'status-read', 'status-failed');
            // Adicionar nova classe de status
            messageElement.classList.add(`status-${status}`);
            
            // Atualizar ícone/texto de status
            const statusElement = messageElement.querySelector('.message-status');
            if (statusElement) {
                let statusText = '✓'; // enviado
                
                if (status === 'delivered') statusText = '✓✓'; // entregue
                else if (status === 'read') statusText = '✓✓ 👁️'; // lido
                else if (status === 'failed') statusText = '❌'; // falhou
                
                statusElement.textContent = statusText;
            }
        }
    }
    
    // Formatar mensagem para status - útil para usar fora do UI padrão
    getStatusHTML(status) {
        switch(status) {
            case 'sent':
                return '<span class="message-status-sent">✓</span>';
            case 'delivered':
                return '<span class="message-status-delivered">✓✓</span>';
            case 'read':
                return '<span class="message-status-read">✓✓ 👁️</span>';
            case 'failed':
                return '<span class="message-status-failed">❌</span>';
            default:
                return '<span class="message-status-pending">⏱️</span>';
        }
    }
    
    // Adicionar um método para salvar o messageId no relatório
    async updateReportDelivery(reportId, messageId, phone) {
        try {
            // Verificar se temos os dados necessários
            if (!reportId) {
                throw new Error('ID do relatório é obrigatório');
            }
            
            console.log(`Atualizando relatório ${reportId} com entrega por WhatsApp${messageId ? ', messageId: ' + messageId : ''}`);
            
            // Preparar os dados da entrega
            const deliveryData = {
                deliveryMethod: 'whatsapp',
                deliveryConfirmation: messageId || null, // O ID da mensagem do WhatsApp (pode ser null)
                deliveredAt: new Date().toISOString(),
                status: 'delivered'
            };
            
            // Chamar a API para atualizar o status de entrega
            const response = await fetch(`/reports/${reportId}/update-delivery`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deliveryData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ao atualizar entrega: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Relatório atualizado com sucesso:', data);
            
            // Se temos um messageId válido, armazenar a associação
            if (messageId) {
                this.messages.set(messageId, {
                    ...this.messages.get(messageId) || {},
                    reportId,
                    phone,
                    deliveredAt: new Date().toISOString()
                });
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao atualizar status de entrega do relatório:', error);
            throw error;
        }
    }
}