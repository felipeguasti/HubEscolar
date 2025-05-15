document.addEventListener('DOMContentLoaded', function() {
    const isReportCenter = window.location.pathname.includes("reports/center");
    if (isReportCenter) {

        // Cache DOM elements
        const searchStudentInput = document.getElementById('student-search');
        const autocompleteResultsList = document.getElementById('autocomplete-results');
        let highlightedIndex = -1;

        // Event Listener for search input
        searchStudentInput?.addEventListener('input', debounce(async (e) => {
            const searchTerm = e.target.value;
            await searchStudents(searchTerm);
        }, 300));
        // Search students function
        async function searchStudents(searchTerm) {
            if (!searchTerm?.trim()) {
                if (autocompleteResultsList) {
                    autocompleteResultsList.innerHTML = '';
                }
                highlightedIndex = -1;
                return;
            }

            try {
                showLoading();
                const apiUrl = `/users/list?query=${encodeURIComponent(searchTerm)}&role=Aluno`;
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status}`);
                }
                
                const data = await response.json();
                displayAutocompleteResults(data);
            } catch (error) {
                console.error('Erro ao buscar alunos:', error);
                if (autocompleteResultsList) {
                    autocompleteResultsList.innerHTML = '<li class="autocomplete-error">Erro ao buscar alunos</li>';
                }
            } finally {
                hideLoading();
            }
        }

        // Display autocomplete results
        function displayAutocompleteResults(students) {
            autocompleteResultsList.innerHTML = '';
            highlightedIndex = -1;

            if (students && students.length > 0) {
                students.forEach((student, index) => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${student.name} (${student.userClass || 'Sem turma'})`;
                    listItem.dataset.studentId = student.id;
                    listItem.dataset.studentName = student.name;
                    listItem.addEventListener('click', () => {
                        searchStudentInput.value = student.name;
                        autocompleteResultsList.innerHTML = '';
                        fetchReportsByStudentId(student.id);
                    });
                    autocompleteResultsList.appendChild(listItem);
                });
            } else if (searchStudentInput.value.trim()) {
                const listItem = document.createElement('li');
                listItem.textContent = 'Nenhum aluno encontrado';
                autocompleteResultsList.appendChild(listItem);
            }
        }

        // Fetch reports by student ID
        let currentStudentIdFilter = null;
        async function fetchReportsByStudentId(studentId) {
            try {
                showLoading();
        
                // Reset to first page when filtering by student
                const currentPage = 1;
                const limit = 10;
                const offset = 0;
        
                currentStudentIdFilter = studentId; // Armazena o studentId filtrado
        
                const filters = {
                    studentId,
                    limit,
                    offset
                };
        
                const queryString = new URLSearchParams(filters).toString();
                const response = await fetch(`/reports/list?${queryString}`);
        
                if (!response.ok) {
                    throw new Error('Failed to fetch reports');
                }
        
                const data = await response.json();
        
                // Calculate pagination
                const totalPages = Math.ceil(data.total / limit);
        
                // Update UI components
                updateReportsGrid(data.reports);
                updatePagination({
                    current: currentPage,
                    total: data.total,
                    pages: totalPages,
                    studentId: studentId // Passa o studentId para updatePagination
                });
                updateStats({
                    total: data.total,
                    pending: data.reports.filter(r => r.status === 'pending').length,
                    delivered: data.reports.filter(r => r.status === 'delivered').length,
                    archived: data.reports.filter(r => r.status === 'archived').length
                });
        
                // Debug info
                console.log('Student Filter Debug:', {
                    studentId,
                    totalReports: data.total,
                    totalPages,
                    currentPage
                });
        
            } catch (error) {
                console.error('Error fetching reports:', error);
                showToast('Erro ao buscar relatórios', 'error');
            } finally {
                hideLoading();
            }
        }

        // Event Listeners
        searchStudentInput?.addEventListener('input', debounce(function() {
            searchStudents(this.value);
        }, 300));

        // Keyboard navigation
        searchStudentInput?.addEventListener('keydown', function(event) {
            const listItems = autocompleteResultsList.querySelectorAll('li');

            if (listItems.length > 0) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    highlightedIndex = (highlightedIndex + 1) % listItems.length;
                    updateHighlight();
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    highlightedIndex = highlightedIndex <= 0 ? listItems.length - 1 : highlightedIndex - 1;
                    updateHighlight();
                } else if (event.key === 'Enter') {
                    event.preventDefault();
                    if (highlightedIndex >= 0) {
                        listItems[highlightedIndex].click();
                    }
                } else if (event.key === 'Escape') {
                    autocompleteResultsList.innerHTML = '';
                    highlightedIndex = -1;
                }
            }
        });

        function updateHighlight() {
            const listItems = autocompleteResultsList.querySelectorAll('li');
            listItems.forEach((item, index) => {
                if (index === highlightedIndex) {
                    item.classList.add('autocomplete-highlighted');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('autocomplete-highlighted');
                }
            });
        }

        const classFilter = document.querySelector('#classFilter');
        classFilter?.addEventListener('change', () => {
            handleFilters(1); // Reset para a primeira página ao mudar o filtro de turma
        });
        const statusFilter = document.getElementById('status-filter');
        const reportsGrid = document.querySelector('.reports-grid');
        const paginationContainer = document.querySelector('.pagination');

        // Event Listeners for Filters
        searchStudentInput?.addEventListener('input', debounce(handleFilters, 500));
        classFilter?.addEventListener('change', handleFilters);
        statusFilter?.addEventListener('change', handleFilters);

        // Event Delegation for Report Actions
        reportsGrid?.addEventListener('click', handleReportActions);
        paginationContainer?.addEventListener('click', handlePagination);

        // Helper Functions
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Filters Handler
        async function handleFilters(page = 1, studentId = currentStudentIdFilter, classId = document.getElementById("classFilter")?.value || '') {
            try {
                showLoading();
        
                const currentPage = parseInt(page) || 1;
                const limit = 10;
                const offset = (currentPage - 1) * limit;
        
                if (isNaN(offset)) {
                    throw new Error('Invalid page number');
                }
        
                const filters = {
                    studentId: studentId || searchStudentInput?.value || '',
                    classId: classId, // Filtro por turma
                    reportLevel: '',
                    suspended: '',
                    callParents: '',
                    startDate: document.querySelector('#startDate')?.value || '',
                    endDate: document.querySelector('#endDate')?.value || '',
                    limit,
                    offset
                };
        
                const queryString = new URLSearchParams(filters).toString();
                const response = await fetch(`/reports/list?${queryString}`);
        
                if (!response.ok) {
                    throw new Error('Failed to fetch reports');
                }
        
                const data = await response.json();
        
                // Usar total para paginação
                const totalPages = Math.ceil(data.total / limit);
        
                updateReportsGrid(data.reports);
                updatePagination({
                    current: currentPage,
                    total: data.total,
                    pages: totalPages,
                    studentId: studentId,
                    classId: classId
                });
        
                // Stats continua usando o total geral
                updateStats({
                    total: data.total,
                    pending: data.reports.filter(r => r.status === 'pending').length,
                    delivered: data.reports.filter(r => r.status === 'delivered').length,
                    archived: data.reports.filter(r => r.status === 'archived').length
                });
        
                // Debug
                console.log('Pagination Debug:', {
                    currentPage,
                    total: data.total,
                    totalPages,
                    offset,
                    reportsReceived: data.filtered,
                    studentId,
                    classId
                });
        
            } catch (error) {
                console.error('Error fetching filtered reports:', error);
                showToast('Erro ao filtrar relatórios', 'error');
            } finally {
                hideLoading();
            }
        }
        
        // Chamada inicial sem filtro específico
        handleFilters(1);

        // Actions Handler
        async function handleReportActions(event) {
            const button = event.target.closest('button');
            if (!button) return;

            const reportId = button.dataset.reportId;
            if (!reportId) return;

            try {
                switch (button.className) {
                    case 'btn-view':
                        await viewReport(reportId);
                        break;
                    case 'btn-print':
                        await printReport(reportId);
                        break;
                    case 'btn-delivery':
                        await registerDelivery(reportId);
                        break;
                }
            } catch (error) {
                console.error('Error handling report action:', error);
                showToast('Erro ao executar ação', 'error');
            }
        }

        // Report Actions
        async function viewReport(reportId) {
            try {
                showLoading();
                const response = await fetch(`/reports/list?id=${reportId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch report details');
                }
                const data = await response.json();
                
// Encontrar o relatório específico na lista
                // Encontrar o relatório específico na lista
                const report = data.reports.find(r => r.id === parseInt(reportId));
                if (!report) {
                    throw new Error('Report not found');
                }
        
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Detalhes da Advertência</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="report-info">
                                <h3>Informações do Aluno</h3>
                                <p><strong>Nome:</strong> ${report.studentName}</p>
                                <p><strong>Turma:</strong> ${report.studentClass}</p>
                                
                                <h3>Ocorrência</h3>
                                <p><strong>Data:</strong> ${new Date(report.createdAt).toLocaleDateString('pt-BR')}</p>
                                <p><strong>Registrado por:</strong> ${report.createdByName} (${report.createdByRole})</p>
                                <p><strong>Gravidade:</strong> ${report.reportLevel}</p>
                                <p><strong>Descrição:</strong> ${report.content}</p>
                                
                                ${report.reportObservation ? `
                                    <p><strong>Observações:</strong> ${report.reportObservation}</p>
                                ` : ''}
                                
                                ${report.reportRecommendation ? `
                                    <p><strong>Recomendações:</strong> ${report.reportRecommendation}</p>
                                ` : ''}
        
                                ${report.suspended ? `
                                    <div class="suspension-info">
                                        <h3>Suspensão</h3>
                                        <p><strong>Duração:</strong> ${report.suspensionDuration} dias</p>
                                    </div>
                                ` : ''}
        
                                ${report.callParents ? `
                                    <div class="parents-meeting">
                                        <h3>Reunião com Responsáveis</h3>
                                        <p><strong>Data Agendada:</strong> ${new Date(report.parentsMeeting).toLocaleString('pt-BR')}</p>
                                    </div>
                                ` : ''}
        
                                ${report.deliveredAt ? `
                                    <div class="delivery-info">
                                        <h3>Informações de Entrega</h3>
                                        <p><strong>Entregue em:</strong> ${new Date(report.deliveredAt).toLocaleString('pt-BR')}</p>
                                        <p><strong>Método:</strong> ${report.deliveryMethod}</p>
                                        ${report.parentResponse ? `
                                            <p><strong>Resposta dos Responsáveis:</strong> ${report.parentResponse}</p>
                                        ` : ''}
                                        ${report.signedBy ? `
                                            <p><strong>Nome do Responsável:</strong> ${report.signedBy}</p>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
        
                document.body.appendChild(modal);
        
                // Event Listeners
                const closeBtn = modal.querySelector('.modal-close');
                const closeModal = () => {
                    document.body.removeChild(modal);
                };
        
                closeBtn.addEventListener('click', closeModal);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeModal();
                });
        
            } catch (error) {
                console.error('Error viewing report:', error);
                showToast('Erro ao visualizar relatório', 'error');
            } finally {
                hideLoading();
            }
        }
        
        async function printReport(reportId) {
            try {
                showLoading();
                const response = await fetch(`/reports/list?id=${reportId}`);
                const data = await response.json();
                
                if (!data.reports || data.reports.length === 0) {
                    throw new Error('Relatório não encontrado');
                }
        
                const report = data.reports[0];
                
                // Debug dos dados
                const studentResponse = await fetch(`/users/list/${report.studentId}`);
                const studentData = await studentResponse.json();
                console.log('Verificando dados do aluno:', {
                    userClass: studentData.userClass,
                    name: studentData.name
                });
                
                // Forçar verificação do fallback
                const turma = (studentData.userClass === null || studentData.userClass === undefined) 
                    ? 'Sem Turma' 
                    : studentData.userClass;
                
                const pdfResponse = await fetch(`/reports/${reportId}/print`);
                const blob = await pdfResponse.blob();
                const url = window.URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `${turma} - ${studentData.name} - Advertencia ${reportId}.pdf`;
                document.body.appendChild(a);
                a.click();
                
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Error printing report:', error);
                showToast('Erro ao gerar PDF', 'error');
            } finally {
                hideLoading();
            }
        }

        async function registerDelivery(reportId) {
            try {
                const result = await showDeliveryMethodModal();
                if (!result) return;
        
                const { method, parentResponse, signedBy, signedAt } = result;
        
                showLoading();
                const response = await fetch(`/reports/${reportId}/deliver`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        method,
                        parentResponse,
                        signedBy,
                        signedAt
                    })
                });
        
                if (!response.ok) throw new Error('Failed to register delivery');
        
                showToast('Entrega registrada com sucesso', 'success');
                await handleFilters(); // Refresh the list
            } catch (error) {
                console.error('Error registering delivery:', error);
                showToast('Erro ao registrar entrega', 'error');
            } finally {
                hideLoading();
            }
        }

        // UI Update Functions
        function updateReportsGrid(reports) {
            if (!reports || !reports.length) {
                reportsGrid.innerHTML = `
                    <div class="no-reports">
                        <h2>Nenhuma advertência encontrada</h2>
                    </div>`;
                return;
            }
        
            reportsGrid.innerHTML = reports.map(report => `
                <div class="report-card ${report.status}">
                    <div class="report-header">
                        <h3>${report.studentName || 'Aluno não identificado'}</h3>
                        <span class="report-date">${new Date(report.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="report-body">
                        <p><strong>Turma:</strong> ${report.studentClass}</p>
                        <p><strong>Motivo:</strong> ${report.content}</p>
                        <p><strong>Status:</strong> ${
                            report.status === 'pending' ? 'Pendente' : 
                            report.status === 'delivered' ? 'Entregue' : 'Arquivado'
                        }</p>
                        ${report.deliveredAt ? `
                            <p><strong>Entregue em:</strong> ${new Date(report.deliveredAt).toLocaleDateString('pt-BR')}</p>
                            <p><strong>Método:</strong> ${report.deliveryMethod || 'N/A'}</p>
                        ` : ''}
                    </div>
                    <div class="report-actions">
                        <button class="btn-view" data-report-id="${report.id}">Ver</button>
                        <button class="btn-print" data-report-id="${report.id}">Imprimir</button>
                        ${report.status === 'pending' ? `
                            <button class="btn-delivery" data-report-id="${report.id}">Registrar Entrega</button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
        
        function updatePagination({ current, total, pages, studentId }) {
            const paginationContainer = document.querySelector('.pagination');
            console.log('UpdatePagination called with:', { current, total, pages, studentId });
        
            // Se não houver container ou apenas 1 página, não mostra paginação
            if (!paginationContainer) {
                console.error('Pagination container not found');
                return;
            }
        
            // Sempre calcular o número total de páginas
            const totalPages = Math.ceil(total / 10); // usando 10 como limit fixo
        
            console.log('Calculated total pages:', totalPages);
        
            // Se houver apenas 1 página, limpa o container
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }
        
            let paginationHTML = '';
        
            // Botão Previous
            paginationHTML += `
                <button class="page-btn prev" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>
                    &laquo;
                </button>
            `;
        
            // Números das páginas
            for (let i = 1; i <= totalPages; i++) {
                if (
                    i === 1 ||
                    i === totalPages ||
                    (i >= current - 2 && i <= current + 2)
                ) {
                    paginationHTML += `
                        <button class="page-btn numbered ${i === current ? 'active' : ''}"
                                data-page="${i}">
                            ${i}
                        </button>
                    `;
                } else if (i === current - 3 || i === current + 3) {
                    paginationHTML += '<span class="page-ellipsis">...</span>';
                }
            }
        
            // Botão Next
            paginationHTML += `
                <button class="page-btn next" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>
                    &raquo;
                </button>
            `;
        
            paginationContainer.innerHTML = paginationHTML;
        
            // Adiciona event listeners aos botões
            const buttons = paginationContainer.querySelectorAll('.page-btn');
            buttons.forEach(button => {
                if (!button.disabled) {
                    button.addEventListener('click', () => {
                        const newPage = parseInt(button.dataset.page);
                        if (!isNaN(newPage) && newPage > 0 && newPage <= totalPages) {
                            console.log('Changing to page:', newPage);
                            handleFilters(newPage, studentId); // Passa o studentId ao clicar no botão
                        }
                    });
                }
            });
        }
        
        function updateStats(stats) {
            const statsContainer = document.querySelector('.stats-container');
            if (!statsContainer || !stats) return;
        
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>Total</h3>
                    <p>${stats.total}</p>
                </div>
                <div class="stat-card">
                    <h3>Pendentes</h3>
                    <p>${stats.pending}</p>
                </div>
                <div class="stat-card">
                    <h3>Entregues</h3>
                    <p>${stats.delivered}</p>
                </div>
                <div class="stat-card">
                    <h3>Arquivadas</h3>
                    <p>${stats.archived}</p>
                </div>
            `;
        }

        // Modal Functions
        function showReportModal(report) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Detalhes da Advertência</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="report-info">
                            <h3>Informações do Aluno</h3>
                            <p><strong>Nome:</strong> ${report.student?.name || 'Não identificado'}</p>
                            <p><strong>Turma:</strong> ${report.student?.userClass || 'N/A'}</p>
                            
                            <h3>Ocorrência</h3>
                            <p><strong>Data:</strong> ${new Date(report.createdAt).toLocaleDateString('pt-BR')}</p>
                            <p><strong>Gravidade:</strong> ${report.reportLevel}</p>
                            <p><strong>Descrição:</strong> ${report.content}</p>
                            
                            ${report.reportObservation ? `
                                <p><strong>Observações:</strong> ${report.reportObservation}</p>
                            ` : ''}
                            
                            ${report.reportRecommendation ? `
                                <p><strong>Recomendações:</strong> ${report.reportRecommendation}</p>
                            ` : ''}

                            ${report.suspended ? `
                                <div class="suspension-info">
                                    <h3>Suspensão</h3>
                                    <p><strong>Duração:</strong> ${report.suspensionDuration} dias</p>
                                </div>
                            ` : ''}

                            ${report.callParents ? `
                                <div class="parents-meeting">
                                    <h3>Reunião com Responsáveis</h3>
                                    <p><strong>Data Agendada:</strong> ${new Date(report.parentsMeeting).toLocaleString('pt-BR')}</p>
                                </div>
                            ` : ''}

                            ${report.deliveredAt ? `
                                <div class="delivery-info">
                                    <h3>Informações de Entrega</h3>
                                    <p><strong>Entregue em:</strong> ${new Date(report.deliveredAt).toLocaleString('pt-BR')}</p>
                                    <p><strong>Método:</strong> ${report.deliveryMethod}</p>
                                    <p><strong>Confirmação:</strong> ${report.deliveryConfirmation || 'N/A'}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Event Listeners
            modal.querySelector('.modal-close').addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        }

        function showDeliveryMethodModal() {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Registrar Entrega</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="signature-section">
                                <h3>Assinatura do Responsável</h3>
                                <div class="form-group">
                                    <label for="signedBy">Nome do Responsável:</label>
                                    <input type="text" id="signedBy" required>
                                </div>
                                <div class="form-group">
                                    <label for="signedAt">Data da Assinatura:</label>
                                    <input type="datetime-local" id="signedAt" required>
                                </div>
                            </div>
                            <div class="parent-response-section">
                                <h3>Resposta do Responsável</h3>
                                <textarea 
                                    id="parentResponse" 
                                    placeholder="Digite a resposta do responsável..."
                                    rows="4"
                                    style="width: 100%; margin-top: 10px;"
                                ></textarea>
                            </div>
                            <div class="delivery-options">
                                <button class="delivery-option" data-method="print">
                                    <i class="fas fa-print"></i>
                                    <span>Impressão</span>
                                </button>
                                <button class="delivery-option" data-method="email">
                                    <i class="fas fa-envelope"></i>
                                    <span>E-mail</span>
                                </button>
                                <button class="delivery-option" data-method="whatsapp">
                                    <i class="fab fa-whatsapp"></i>
                                    <span>WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                // Event Listeners
                modal.querySelector('.modal-close').addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(null);
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                        resolve(null);
                    }
                });

                modal.querySelectorAll('.delivery-option').forEach(button => {
                    button.addEventListener('click', () => {
                        const method = button.dataset.method;
                        const signedBy = modal.querySelector('#signedBy').value.trim();
                        const signedAt = modal.querySelector('#signedAt').value;
                        const parentResponse = modal.querySelector('#parentResponse').value.trim();

                        if (!signedBy || !signedAt) {
                            showToast('Preencha os dados da assinatura', 'error');
                            return;
                        }

                        document.body.removeChild(modal);
                        resolve({ 
                            method, 
                            parentResponse,
                            signedBy,
                            signedAt
                        });
                    });
                });
            });
        }
        
        // Pagination Handler
        async function handlePagination(event) {
            const button = event.target.closest('.page-btn');
            if (!button) return;
        
            const page = parseInt(button.dataset.page);
            if (!page) return;
        
            try {
                await handleFilters(page, currentStudentIdFilter);
                // Scroll to top smoothly
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                console.error('Error changing page:', error);
                showToast('Erro ao carregar página', 'error');
            }
        }
        
        // Toast Implementation
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <span class="toast-icon">
                        ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
                    </span>
                    <span class="toast-message">${message}</span>
                </div>
                <button class="toast-close">&times;</button>
            `;
        
            // Remove existing toasts
            const existingToasts = document.querySelectorAll('.toast');
            existingToasts.forEach(t => t.remove());
        
            // Add new toast
            document.body.appendChild(toast);
            
            // Show animation
            requestAnimationFrame(() => {
                toast.classList.add('toast-show');
            });
        
            // Auto remove
            const removeToast = () => {
                toast.classList.remove('toast-show');
                setTimeout(() => toast.remove(), 300);
            };
        
            // Close button
            toast.querySelector('.toast-close').addEventListener('click', removeToast);
        
            // Auto close after 5s
            setTimeout(removeToast, 5000);
        }

        async function loadClassesByUserSchool() {
            const schoolId = document.getElementById("loggedInSchoolId")?.value;
            const classSelect = document.getElementById("classFilter");
        
            classSelect.innerHTML = `<option value="">Todas as Turmas</option>`;
        
            if (!schoolId) {
                console.warn("ID da escola do usuário não encontrado.");
                classSelect.innerHTML = `<option value="">Erro ao carregar turmas</option>`;
                return;
            }
        
            try {
                const response = await fetch(`/classes/list?schoolId=${encodeURIComponent(schoolId)}`); // Filtra por schoolId
                if (!response.ok) {
                    console.error("Erro ao buscar turmas:", response.status);
                    classSelect.innerHTML = `<option value="">Erro ao carregar turmas</option>`;
                    return;
                }
                const data = await response.json();
                const classes = data.classes || data;
        
                classSelect.innerHTML += classes.map(cls => `<option value="${cls.id}">${cls.name}</option>`).join("");
        
            } catch (error) {
                console.error("Erro ao buscar turmas:", error);
                classSelect.innerHTML = `<option value="">Erro ao carregar turmas</option>`;
            }
        }
        
        // Chame essa função no carregamento da página
        loadClassesByUserSchool();
    }
});