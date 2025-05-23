document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const schoolId = document.getElementById('schoolId').value;
    const schoolForm = document.getElementById('schoolForm');
    const formFields = schoolForm.querySelectorAll('input:not([type="hidden"])');
    
    // Botões de edição
    const btnEdit = document.getElementById('btn-edit-school');
    const btnSave = document.getElementById('btn-save');
    const btnCancel = document.getElementById('btn-cancel');
    const editControls = document.querySelector('.edit-controls');
    
    // Elementos do WhatsApp
    const btnConnectWhatsApp = document.getElementById('btn-connect-whatsapp');
    const btnDisconnectWhatsApp = document.getElementById('btn-disconnect-whatsapp');
    const btnRefreshQR = document.getElementById('btn-refresh-qr');
    const statusContainer = document.getElementById('status-container');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrImage = document.getElementById('qr-image');
    
    // Popups
    const loading = document.getElementById('loading');
    const popupContainer = document.querySelector('.popup-container');
    const messagePopup = document.getElementById('message-popup');
    const messageText = document.getElementById('message-text');
    const closePopup = document.querySelector('.close-popup');
    
    // Funções para habilitar/desabilitar edição
    function enableEditing() {
        formFields.forEach(field => {
            field.readOnly = false;
        });
        btnEdit.style.display = 'none';
        editControls.style.display = 'block';
    }
    
    function disableEditing() {
        formFields.forEach(field => {
            field.readOnly = true;
        });
        btnEdit.style.display = 'block';
        editControls.style.display = 'none';
    }
    
    // Funções para mostrar/esconder loading e mensagens
    function showLoading() {
        loading.style.display = 'flex';
        popupContainer.classList.add('show');
    }
    
    function hideLoading() {
        loading.style.display = 'none';
        if (!messagePopup.style.display || messagePopup.style.display === 'none') {
            popupContainer.classList.remove('show');
        }
    }
    
    function showMessage(text) {
        messageText.textContent = text;
        messagePopup.style.display = 'block';
        popupContainer.classList.add('show');
        
        // Esconder loading se estiver visível
        loading.style.display = 'none';
    }
    
    // Funções para manipular dados da escola
    async function saveSchoolData() {
        showLoading();
        
        try {
            // Coletar dados do formulário
            const formData = {
                name: document.getElementById('schoolName').value,
                telephone: document.getElementById('schoolTelephone').value,
                address: document.getElementById('schoolAddress').value,
                city: document.getElementById('schoolCity').value,
                state: document.getElementById('schoolState').value,
                cep: document.getElementById('schoolCep').value
            };
            
            // Enviar dados para o servidor
            const response = await fetch(`/schools/edit/${schoolId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            hideLoading();
            
            if (data.success) {
                showMessage('Dados da escola atualizados com sucesso!');
                disableEditing();
            } else {
                throw new Error(data.message || 'Erro ao atualizar dados');
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            hideLoading();
            showMessage('Erro ao salvar: ' + error.message);
        }
    }
    
    // ========== FUNÇÕES DO WHATSAPP ==========
    
    // Verificar status da conexão do WhatsApp
    async function checkWhatsAppStatus() {
        // Se não estiver verificando explicitamente (chamada manual), 
        // evitar mostrar loading para não interromper o usuário
        const isManualCheck = arguments.length > 0 && arguments[0] === true;
        
        if (isManualCheck) {
            showLoading();
        }
        
        try {
            // Passar o schoolId como sessionId para o serviço
            const response = await fetch(`/whatsapp/auth/status?sessionId=${schoolId}`);
            const data = await response.json();
            
            let statusHtml = '';
            
            if (data.connected) {
                statusHtml = `
                    <div class="alert-box success">
                        <h3><i class="fas fa-check-circle"></i> WhatsApp Conectado</h3>
                        <p>O serviço de WhatsApp está ativo e pronto para enviar mensagens.</p>
                        <p><strong>Número:</strong> ${data.phoneNumber || 'Não disponível'}</p>
                    </div>
                `;
                
                // Esconder QR code quando conectado
                qrcodeContainer.style.display = 'none';
            } else {
                statusHtml = `
                    <div class="alert-box warning">
                        <h3><i class="fas fa-exclamation-triangle"></i> WhatsApp Desconectado</h3>
                        <p>O WhatsApp não está conectado. Clique em "Conectar WhatsApp" para configurar.</p>
                    </div>
                `;
            }
            
            statusContainer.innerHTML = statusHtml;
        } catch (error) {
            console.error('Erro ao verificar status do WhatsApp:', error);
            statusContainer.innerHTML = `
                <div class="alert-box danger">
                    <h3><i class="fas fa-times-circle"></i> Erro</h3>
                    <p>Não foi possível verificar o status do WhatsApp.</p>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            if (isManualCheck) {
                hideLoading();
            }
        }
    }
    
    // Função aprimorada para mostrar loading com mensagem personalizada
    function showLoadingWithMessage(message) {
        // Verificar se já existe uma div de mensagem de loading
        let loadingMessage = document.getElementById('loading-message');
        
        // Se não existir, criar uma
        if (!loadingMessage) {
            loadingMessage = document.createElement('div');
            loadingMessage.id = 'loading-message';
            loadingMessage.className = 'loading-message';
            
            // Estilizar a mensagem
            Object.assign(loadingMessage.style, {
                color: 'white',
                textAlign: 'center',
                maxWidth: '400px',
                margin: '20px auto 0',
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
            });
            
            // Adicionar ao container de loading
            loading.appendChild(loadingMessage);
        }
        
        // Definir o conteúdo da mensagem
        loadingMessage.innerHTML = message;
        
        // Mostrar o loading
        loading.style.display = 'flex';
        popupContainer.classList.add('show');
    }
    
    // Função modificada para exibir QR Code para conexão
    function showQRCode() {
        // Mostrar loading com mensagem específica
        showLoadingWithMessage(`
            <h3 style="margin-bottom: 15px; color: #4cc9f0;">Preparando conexão do WhatsApp</h3>
            <p>Estamos gerando o QR Code para você conectar seu WhatsApp.</p>
            <p>Este processo pode levar alguns minutos.</p>
            <p><strong>Importante:</strong></p>
            <ul style="text-align: left; margin: 10px 0; list-style-type: disc; padding-left: 20px;">
                <li>Se você já escaneou o QR Code anteriormente, pode não ser necessário escanear novamente.</li>
                <li>Aguarde o status mudar para "Conectado" após o carregamento.</li>
                <li>Mantenha seu celular conectado à internet.</li>
            </ul>
        `);
        
        // Iniciar a requisição do QR Code
        refreshQRCode();
        
        // Após 3 segundos, esconder loading e mostrar o container do QR code
        setTimeout(() => {
            hideLoading();
            qrcodeContainer.style.display = 'block';
            
            // Verificar status após 5 segundos (para dar tempo de conectar caso já tenha escaneado antes)
            setTimeout(() => {
                checkWhatsAppStatus();
            }, 5000);
        }, 3000);
    }
    
    // Atualizar QR Code
    function refreshQRCode() {
        const timestamp = new Date().getTime();
        
        // Mostrar loading sem mensagem
        showLoading();
        
        // Carregar a nova imagem com evento para detectar quando terminar
        const newImage = new Image();
        newImage.onload = function() {
            // Atualizar o src da imagem existente
            qrImage.src = this.src;
            hideLoading();
        };
        
        newImage.onerror = function() {
            hideLoading();
            showMessage('Erro ao carregar o QR Code. Tente novamente.');
        };
        
        // Iniciar o carregamento da imagem
        newImage.src = `/whatsapp/auth/qrcode?sessionId=${schoolId}&t=${timestamp}`;
    }
    
    // Desconectar WhatsApp
    async function disconnectWhatsApp() {
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp? Será necessário escanear o QR code novamente.')) {
            return;
        }
        
        showLoading();
        
        try {
            // Passar schoolId como sessionId no corpo da requisição
            const response = await fetch(`/whatsapp/auth/disconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId: schoolId })
            });
            
            const data = await response.json();
            
            hideLoading();
            
            if (data.success) {
                showMessage('WhatsApp desconectado com sucesso!');
                setTimeout(() => {
                    checkWhatsAppStatus();
                    popupContainer.classList.remove('show');
                }, 2000);
            } else {
                throw new Error(data.message || 'Erro ao desconectar WhatsApp');
            }
        } catch (error) {
            console.error('Erro ao desconectar WhatsApp:', error);
            hideLoading();
            showMessage('Erro ao desconectar: ' + error.message);
        }
    }
    
    // Adicionar botão para resetar a sessão do WhatsApp
    function addResetButton() {
        // Verificar se o botão já existe para evitar duplicação
        if (document.getElementById('btn-reset-whatsapp')) {
            return;
        }
        
        const resetButton = document.createElement('button');
        resetButton.id = 'btn-reset-whatsapp';
        resetButton.className = 'btn btn-warning';
        resetButton.innerHTML = '<i class="fas fa-sync-alt"></i> Resetar Conexão';
        
        // Adicionar ao lado do botão de desconectar
        if (btnDisconnectWhatsApp && btnDisconnectWhatsApp.parentNode) {
            btnDisconnectWhatsApp.parentNode.appendChild(resetButton);
            
            // Adicionar event listener
            resetButton.addEventListener('click', resetWhatsAppSession);
        }
    }
    
    // Função para resetar sessão do WhatsApp
    async function resetWhatsAppSession() {
        if (!confirm('ATENÇÃO: Isso vai remover todos os dados da sessão atual do WhatsApp. Você precisará escanear o QR Code novamente. Continuar?')) {
            return;
        }
        
        showLoading();
        
        try {
            const response = await fetch(`/whatsapp/auth/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId: schoolId })
            });
            
            const data = await response.json();
            
            hideLoading();
            
            if (data.success) {
                showMessage('Sessão do WhatsApp resetada com sucesso!');
                setTimeout(() => {
                    showQRCode();
                    checkWhatsAppStatus();
                    popupContainer.classList.remove('show');
                }, 2000);
            } else {
                throw new Error(data.message || 'Erro ao resetar sessão do WhatsApp');
            }
        } catch (error) {
            console.error('Erro ao resetar sessão do WhatsApp:', error);
            hideLoading();
            showMessage('Erro ao resetar sessão: ' + error.message);
        }
    }
    
    // ========== EVENT LISTENERS ==========
    
    // Event listeners para edição de escola
    if (btnEdit) {
        btnEdit.addEventListener('click', enableEditing);
    }
    
    if (btnCancel) {
        btnCancel.addEventListener('click', disableEditing);
    }
    
    if (btnSave) {
        btnSave.addEventListener('click', saveSchoolData);
    }
    
    // Event listener para fechar popup
    if (closePopup) {
        closePopup.addEventListener('click', function() {
            messagePopup.style.display = 'none';
            popupContainer.classList.remove('show');
        });
    }
    
    // Event listeners para WhatsApp
    if (btnConnectWhatsApp) {
        btnConnectWhatsApp.addEventListener('click', showQRCode);
    }
    
    if (btnDisconnectWhatsApp) {
        btnDisconnectWhatsApp.addEventListener('click', disconnectWhatsApp);
    }
    
    if (btnRefreshQR) {
        btnRefreshQR.addEventListener('click', refreshQRCode);
    }
    
    // Inicialização
    
    // Verificar status do WhatsApp na carga da página
    if (statusContainer) {
        checkWhatsAppStatus();
        
        // Verificar status a cada 30 segundos
        setInterval(checkWhatsAppStatus, 30000);
    }
    
    // Adicionar botão de reset da sessão
    addResetButton();
});