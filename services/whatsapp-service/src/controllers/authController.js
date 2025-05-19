const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class AuthController {
    async getQRCode(req, res) {
        try {
            const { sessionId = 'default' } = req.query;
            
            // Inicializar cliente para esta sessão se necessário
            await whatsappService.initialize(sessionId);
            
            // Obter stream do QR code
            const qrStream = await whatsappService.getQRCodeStream(sessionId);
            
            if (qrStream) {
                // Define os headers para a imagem
                res.setHeader('Content-Type', 'image/png');
                // Encaminha o stream da imagem
                qrStream.pipe(res);
            } else {
                res.status(404).send('QR Code não disponível');
            }
        } catch (error) {
            logger.error(`Erro ao obter QR code para sessão ${req.query.sessionId || 'default'}:`, error);
            res.status(500).send('Erro ao gerar QR Code');
        }
    }

    async getStatus(req, res) {
        try {
            const { sessionId = 'default' } = req.query;
            const status = await whatsappService.getStatus(sessionId);
            
            return res.json(status);
        } catch (error) {
            logger.error(`Erro ao verificar status para sessão ${req.query.sessionId || 'default'}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar status da conexão',
                error: error.message
            });
        }
    }

    async disconnect(req, res) {
        try {
            const { sessionId = 'default' } = req.body;
            const result = await whatsappService.disconnect(sessionId);
            
            return res.json(result);
        } catch (error) {
            logger.error(`Erro ao desconectar sessão ${req.body.sessionId || 'default'}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao desconectar WhatsApp',
                error: error.message
            });
        }
    }

    async getAllSessions(req, res) {
        try {
            const sessions = whatsappService.getAllSessions();
            
            return res.json({
                success: true,
                data: sessions
            });
        } catch (error) {
            logger.error('Erro ao listar sessões:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao listar sessões ativas',
                error: error.message
            });
        }
    }

    // Adicionando método para a página de conexão
    async getConnectPage(req, res) {
        try {
            // Obter sessionId da query, se disponível
            const { sessionId = 'default' } = req.query;
            
            res.send(`
                <html>
                    <head>
                        <title>Conectar WhatsApp</title>
                        <style>
                            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                            h1 { color: #075e54; }
                            img { border: 1px solid #ddd; border-radius: 4px; padding: 5px; max-width: 300px; }
                            .container { text-align: center; }
                            .instructions { text-align: left; margin-top: 20px; }
                            .reload { margin-top: 10px; }
                            .status { margin-top: 20px; padding: 10px; border-radius: 5px; }
                            .status.connected { background-color: #dcf8c6; color: #075e54; }
                            .status.disconnected { background-color: #f8dcdc; color: #c62828; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Conecte o HubEscolar ao WhatsApp</h1>
                            <p>ID da Sessão: <strong>${sessionId}</strong></p>
                            <div id="statusArea">
                                <p>Verificando status...</p>
                            </div>
                            <div id="qrcode">
                                <img src="/whatsapp/auth/qrcode?sessionId=${sessionId}" alt="QR Code" id="qr-image" onerror="handleQrError()">
                                <div id="no-qr" style="display:none;">
                                    <p>QR Code não disponível. Pode ser que:</p>
                                    <ul>
                                        <li>A sessão ainda não foi iniciada</li>
                                        <li>O WhatsApp já está conectado</li>
                                        <li>Houve um erro ao gerar o QR Code</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="reload">
                                <button onclick="refreshQR()">Atualizar QR Code</button>
                                <button onclick="checkStatus()">Verificar Status</button>
                            </div>
                            <div class="instructions">
                                <h2>Instruções:</h2>
                                <ol>
                                    <li>Abra o WhatsApp no seu celular</li>
                                    <li>Toque em Configurações > Dispositivos Conectados > Vincular um dispositivo</li>
                                    <li>Escaneie o QR Code acima</li>
                                    <li>Aguarde a conexão ser estabelecida</li>
                                </ol>
                            </div>
                        </div>

                        <script>
                            const sessionId = "${sessionId}";
                            
                            function handleQrError() {
                                document.getElementById('no-qr').style.display = 'block';
                                document.getElementById('qr-image').style.display = 'none';
                            }
                            
                            function refreshQR() {
                                document.getElementById('qr-image').style.display = 'block';
                                document.getElementById('no-qr').style.display = 'none';
                                document.getElementById('qr-image').src = '/whatsapp/auth/qrcode?sessionId=' + sessionId + '&t=' + new Date().getTime();
                            }
                            
                            async function checkStatus() {
                                try {
                                    const response = await fetch('/whatsapp/auth/status?sessionId=' + sessionId);
                                    const data = await response.json();
                                    
                                    const statusArea = document.getElementById('statusArea');
                                    
                                    if (data.connected) {
                                        statusArea.innerHTML = '<div class="status connected">' +
                                            '<h3>WhatsApp Conectado!</h3>' +
                                            '<p>Número: ' + (data.phoneNumber || 'Não disponível') + '</p>' +
                                            '<p>Status: ' + data.status + '</p>' +
                                            '</div>';
                                            
                                        // Se está conectado, esconder o QR code
                                        document.getElementById('qrcode').style.display = 'none';
                                    } else {
                                        statusArea.innerHTML = '<div class="status disconnected">' +
                                            '<h3>WhatsApp Desconectado</h3>' +
                                            '<p>Por favor, escaneie o QR Code para conectar.</p>' +
                                            '</div>';
                                            
                                        // Se está desconectado, mostrar o QR code
                                        document.getElementById('qrcode').style.display = 'block';
                                        
                                        // Atualizar o QR code
                                        refreshQR();
                                    }
                                } catch (error) {
                                    console.error('Erro ao verificar status:', error);
                                    document.getElementById('statusArea').innerHTML = 
                                        '<div class="status disconnected">' +
                                        '<h3>Erro ao verificar status</h3>' +
                                        '<p>Não foi possível verificar o status da conexão.</p>' +
                                        '</div>';
                                }
                            }
                            
                            // Verificar status imediatamente e depois a cada 10 segundos
                            checkStatus();
                            setInterval(checkStatus, 10000);
                            
                            // Atualizar o QR automaticamente a cada 30 segundos se não estiver conectado
                            setInterval(() => {
                                const statusArea = document.getElementById('statusArea');
                                if (statusArea.innerText.includes('Desconectado')) {
                                    refreshQR();
                                }
                            }, 30000);
                        </script>
                    </body>
                </html>
            `);
        } catch (error) {
            logger.error(`Erro ao carregar página de conexão:`, error);
            res.status(500).send('Erro ao carregar página de conexão');
        }
    }
}

module.exports = new AuthController();