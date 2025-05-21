document.addEventListener('DOMContentLoaded', function() {
    const isBehavior = window.location.pathname.includes("behavior");
    if (isBehavior) {
        // Declarar no escopo global para uso em todas as funções
        if (typeof MessageTracker !== 'undefined') {
            window.messageTracker = new MessageTracker();
            window.messageTracker.connectSocket();
        } else {
            console.warn('MessageTracker não está disponível. Funcionalidades de WhatsApp não estarão disponíveis.');
        }
        
        const searchStudentInput = document.getElementById('report-form-search-student');
        const autocompleteResultsList = document.getElementById('report-form-autocomplete-results');
        const selectedStudentsTable = document.getElementById('report-form-selected-students');
        const selectedStudentsListBody = document.getElementById('report-form-selected-students-list');
        const suspendedCheckbox = document.getElementById('report-form-suspended');
        const suspensionDurationGroup = document.getElementById('report-form-suspension-duration-group');
        const callParentsCheckbox = document.getElementById('report-form-call-parents');
        const parentsMeetingGroup = document.getElementById('report-form-parents-meeting-group');
        const toggleIA = document.getElementById('report-form-toggle-ia');
        const manualReportFieldsSection = document.getElementById('report-form-manual-report-fields');
        const iaReportFieldSection = document.getElementById('report-form-ia-report-field');
        const submitReportButton = document.getElementById('report-form-submit-report');
        const disciplinaryOptionsSelect = document.getElementById('report-form-disciplinary-options');

        let selectedStudents = [];
        let highlightedIndex = -1;

        async function searchStudents(searchTerm) {
            if (!searchTerm.trim()) {
                autocompleteResultsList.innerHTML = '';
                highlightedIndex = -1;
                return;
            }

            const apiUrl = `/users/list?query=${searchTerm}&role=Aluno`;

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status}`);
                }
                const data = await response.json();
                displayAutocompleteResults(data);
            } catch (error) {
                console.error('Erro ao buscar alunos:', error);
                autocompleteResultsList.innerHTML = '<li class="autocomplete-error">Erro ao buscar alunos</li>';
            }
        }

                // Modificar a função displayAutocompleteResults para buscar os nomes das turmas
        async function displayAutocompleteResults(students) {
            autocompleteResultsList.innerHTML = '';
            highlightedIndex = -1; // Resetar o índice ao exibir novos resultados

            if (!students || students.length === 0) {
                if (searchStudentInput.value.trim()) {
                    const listItem = document.createElement('li');
                    listItem.textContent = 'Nenhum aluno encontrado';
                    autocompleteResultsList.appendChild(listItem);
                }
                return;
            }

            // Exibir mensagem de carregamento
            const loadingItem = document.createElement('li');
            loadingItem.textContent = 'Carregando informações das turmas...';
            autocompleteResultsList.appendChild(loadingItem);

            try {
                // Obter IDs únicos de turmas para buscar apenas uma vez
                const uniqueGradeIds = [...new Set(students.filter(s => s.gradeId).map(s => s.gradeId))];
                const gradeCache = {};

                // Buscar todas as turmas de uma vez
                if (uniqueGradeIds.length > 0) {
                    // Fazer requisições paralelas para todas as turmas
                    await Promise.all(uniqueGradeIds.map(async gradeId => {
                        try {
                            const response = await fetch(`/grades/${gradeId}`);
                            if (response.ok) {
                                const data = await response.json();
                                if (data.status === 'success' && data.data && data.data.name) {
                                    gradeCache[gradeId] = data.data.name;
                                }
                            }
                        } catch (error) {
                            console.error(`Erro ao buscar turma ${gradeId}:`, error);
                        }
                    }));
                }

                // Limpar lista e reconstruir com os dados já em cache
                autocompleteResultsList.innerHTML = '';
                
                // Agora exibir os alunos com os nomes das turmas já em cache
                students.forEach((student, index) => {
                    const listItem = document.createElement('li');
                    const gradeName = gradeCache[student.gradeId] || 'Sem turma';
                    
                    listItem.textContent = `${student.name} (${gradeName})`;
                    listItem.dataset.studentId = student.id;
                    listItem.dataset.studentName = student.name;
                    listItem.dataset.studentClass = gradeName;
                    listItem.addEventListener('click', addStudentToSelection);
                    autocompleteResultsList.appendChild(listItem);
                });
            } catch (error) {
                console.error("Erro ao processar resultados de busca:", error);
                autocompleteResultsList.innerHTML = '';
                const errorItem = document.createElement('li');
                errorItem.textContent = 'Erro ao carregar resultados';
                errorItem.classList.add('autocomplete-error');
                autocompleteResultsList.appendChild(errorItem);
            }
        }

        function addStudentToSelection(event) {
            const studentId = event.target.dataset.studentId;
            const studentName = event.target.dataset.studentName;
            const studentClass = event.target.dataset.studentClass;

            if (!selectedStudents.includes(studentId)) {
                selectedStudents.push(studentId);
                const row = selectedStudentsListBody.insertRow();
                row.dataset.userId = studentId;

                const nameCell = row.insertCell();
                const classCell = row.insertCell();
                const actionsCell = row.insertCell();

                nameCell.textContent = studentName;
                classCell.textContent = studentClass;

                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-student');
                removeButton.innerHTML = '&#x2715;';
                removeButton.dataset.studentIdToRemove = studentId;
                removeButton.addEventListener('click', removeStudentFromSelection);
                actionsCell.appendChild(removeButton);

                searchStudentInput.value = '';
                autocompleteResultsList.innerHTML = '';
                selectedStudentsTable.style.display = 'table';
                highlightedIndex = -1; // Resetar o índice após a seleção
            }
        }

        function removeStudentFromSelection(event) {
            const studentIdToRemove = event.target.dataset.studentIdToRemove;
            const indexToRemove = selectedStudents.indexOf(studentIdToRemove);
            if (indexToRemove > -1) {
                selectedStudents.splice(indexToRemove, 1);
                const rowToRemove = event.target.closest('tr');
                selectedStudentsListBody.removeChild(rowToRemove);

                if (selectedStudents.length === 0) {
                    selectedStudentsTable.style.display = 'none';
                }
            }
        }

        // Event listener para o campo de busca de alunos (para navegação por teclado)
        searchStudentInput.addEventListener('keydown', function(event) {
            const listItems = autocompleteResultsList.querySelectorAll('li');

            if (listItems.length > 0) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    highlightedIndex++;
                    if (highlightedIndex >= listItems.length) {
                        highlightedIndex = 0;
                    }
                    updateHighlight();
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    highlightedIndex--;
                    if (highlightedIndex < 0) {
                        highlightedIndex = listItems.length - 1;
                    }
                    updateHighlight();
                } else if (event.key === 'Enter') {
                    event.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < listItems.length) {
                        listItems[highlightedIndex].click(); // Simula o clique no item destacado
                        highlightedIndex = -1; // Resetar o índice após a seleção
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

        // Event listener para o campo de busca de alunos (para buscar)
        searchStudentInput.addEventListener('input', function() {
            searchStudents(this.value);
            highlightedIndex = -1; // Resetar o índice em nova busca
        });
        // Função para atualizar a visibilidade dos campos com base no switch da IA
        function updateReportFieldsVisibility() {
            if (toggleIA.checked) {
                manualReportFieldsSection.style.display = 'none';
                iaReportFieldSection.style.display = 'block';
            } else {
                manualReportFieldsSection.style.display = 'block';
                iaReportFieldSection.style.display = 'none';
            }
        }

        toggleIA.addEventListener('change', updateReportFieldsVisibility);

        // Função para controlar a visibilidade do campo de duração da suspensão
        suspendedCheckbox.addEventListener('change', function() {
            suspensionDurationGroup.style.display = this.checked ? 'block' : 'none';
        });

        // Função para controlar a visibilidade do campo de agendamento de reunião
        callParentsCheckbox.addEventListener('change', function() {
            parentsMeetingGroup.style.display = this.checked ? 'block' : 'none';
        });

        // Modificar o event listener do botão submitReportButton
submitReportButton.addEventListener('click', async function() {
    // Verificar se pelo menos um aluno foi selecionado
    const selectedStudentsTable = document.getElementById('report-form-selected-students-list');
    const studentRows = selectedStudentsTable.querySelectorAll('tr');
    
    if (studentRows.length === 0) {
        showNotification('Por favor, selecione pelo menos um aluno.', 'error');
        return;
    }
    
    // Verificar campos obrigatórios com base no modo (manual ou IA)
    if (toggleIA.checked) {
        // Modo IA
        const iaSummary = document.getElementById('report-form-ia-summary').value.trim();
        if (!iaSummary) {
            showNotification('Por favor, forneça um resumo do ocorrido para a IA.', 'error');
            // Destacar o campo com erro
            document.getElementById('report-form-ia-summary').classList.add('error-field');
            document.getElementById('report-form-ia-summary').addEventListener('input', function() {
                this.classList.remove('error-field');
            }, { once: true });
            return;
        }
    } else {
        // Modo Manual
        // 1. Verificar se uma opção de ato indisciplinar foi selecionada
        const disciplinaryOptionsSelect = document.getElementById('report-form-disciplinary-options');
        if (disciplinaryOptionsSelect.selectedIndex === 0) {
            showNotification('Por favor, selecione uma opção de ato disciplinar.', 'error');
            // Destacar o campo com erro
            disciplinaryOptionsSelect.classList.add('error-field');
            disciplinaryOptionsSelect.addEventListener('change', function() {
                this.classList.remove('error-field');
            }, { once: true });
            return;
        }
        
        // 2. Verificar se o campo de observação foi preenchido
        const reportObservation = document.getElementById('report-form-observation').value.trim();
        if (!reportObservation) {
            showNotification('Por favor, preencha o campo de observação.', 'error');
            // Destacar o campo com erro
            document.getElementById('report-form-observation').classList.add('error-field');
            document.getElementById('report-form-observation').addEventListener('input', function() {
                this.classList.remove('error-field');
            }, { once: true });
            return;
        }
        
        // 3. Verificar campos condicionais
        const suspended = document.getElementById('report-form-suspended').checked;
        if (suspended) {
            const suspensionDuration = document.getElementById('report-form-suspension-duration').value;
            if (!suspensionDuration || suspensionDuration <= 0) {
                showNotification('Por favor, informe a duração da suspensão.', 'error');
                // Destacar o campo com erro
                document.getElementById('report-form-suspension-duration').classList.add('error-field');
                document.getElementById('report-form-suspension-duration').addEventListener('input', function() {
                    this.classList.remove('error-field');
                }, { once: true });
                return;
            }
        }
        
        const callParents = document.getElementById('report-form-call-parents').checked;
        if (callParents) {
            const parentsMeeting = document.getElementById('report-form-parents-meeting-datetime').value;
            if (!parentsMeeting) {
                showNotification('Por favor, informe a data e hora da reunião com os responsáveis.', 'error');
                // Destacar o campo com erro
                document.getElementById('report-form-parents-meeting-datetime').classList.add('error-field');
                document.getElementById('report-form-parents-meeting-datetime').addEventListener('input', function() {
                    this.classList.remove('error-field');
                }, { once: true });
                return;
            }
        }
    }
    
    // Se passou por todas as validações, continuar com o processamento original
    const numStudents = studentRows.length;
    let studentsProcessed = 0;

    if (toggleIA.checked) {
        const topics = document.getElementById('report-form-ia-summary').value.trim();
        
        for (const row of studentRows) {
            const studentId = row.dataset.userId;
            
            if (studentId) {
                showLoading();
                try {
                    const response = await fetch('/reports/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            studentId: studentId,
                            topics: topics,
                        }),
                    });
                    const data = await response.json();
                    console.log(`Relatório de IA para o aluno ${studentId} enviado com sucesso:`, data);
                    hideLoading();
        
                    const studentName = row.querySelector('td:first-child').textContent || 'Nome não encontrado';
                    const popupContent = `
                        <div style="text-align: left;">
                            <strong>Nome:</strong> ${studentName}<br>
                            <strong>Data:</strong> ${formatarData(new Date())}<br>
                            <strong>Assunto:</strong> Relatório gerado pela IA<br>
                            <br>
                            <div style="text-align: left;">
                                ${data.report ? `<div style="text-align: left;">${data.report}</div>` : 'Nenhum relatório detalhado gerado.'}
                            </div>
                            <div style="background-color: #f0f7f0; color: #2e8b57; padding: 10px; margin-top: 15px; border-radius: 5px; text-align: center; font-weight: bold;">
                                Relatório Salvo
                            </div>
                        </div>
                    `;
                    // Assumindo que sua função showPopup retorna uma Promise quando fechada
                    await showPopup(popupContent || 'Relatório manual enviado com sucesso.');
        
                } catch (error) {
                    console.error(`Erro ao enviar relatório de IA para o aluno ${studentId}:`, error);
                    hideLoading();
                    await showPopup('Erro ao enviar relatório de IA.');
                } finally {
                    studentsProcessed++;
                    if (studentsProcessed === numStudents) {
                        window.location.reload(); // Atualiza a página após o último aluno
                    }
                }
            } else {
                console.warn("Não foi possível encontrar o studentId para uma linha da tabela (IA).");
                studentsProcessed++;
                if (studentsProcessed === numStudents) {
                    window.location.reload(); // Atualiza a página mesmo se houver um erro com o ID do aluno
                }
            }
        }
    } else {
        for (const row of studentRows) {
            const studentId = row.dataset.userId;
        
            if (studentId) {
                showLoading();
                const reportLevelElements = document.querySelectorAll('input[name="disciplinary-level"]:checked');
                const reportLevel = reportLevelElements.length > 0 ? reportLevelElements[0].value : '';
                const disciplinaryOptionsSelect = document.getElementById('report-form-disciplinary-options');
                const selectedOption = disciplinaryOptionsSelect.options[disciplinaryOptionsSelect.selectedIndex];
                const reportObservation = document.getElementById('report-form-observation').value.trim();
                const reportRecommendation = document.getElementById('report-form-forwarding').value.trim();
                const suspended = document.getElementById('report-form-suspended').checked;
                const suspensionDuration = suspended ? parseInt(document.getElementById('report-form-suspension-duration').value) : null;
                const callParents = document.getElementById('report-form-call-parents').checked;
                const parentsMeeting = callParents ? document.getElementById('report-form-parents-meeting-datetime').value : null;
                const disciplinaryActIndex = selectedOption.dataset.actIndex;
                const reportContentText = selectedOption.value;
        
                try {
                    const response = await fetch('/reports/create/manual', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            studentId: studentId,
                            suspended: suspended,
                            suspensionDuration: suspensionDuration,
                            callParents: callParents,
                            parentsMeeting: parentsMeeting,
                            reportLevel: reportLevel,
                            disciplinaryActIndex: disciplinaryActIndex,
                            reportContentText: reportContentText,
                            reportObservation: reportObservation,
                            reportRecommendation: reportRecommendation,
                        }),
                    });
                    const data = await response.json();
                    console.log(`Relatório manual para o aluno ${studentId} enviado com sucesso:`, data);
                    hideLoading();
        
                    const studentName = row.querySelector('td:first-child').textContent || 'Nome não encontrado';
                    let popupContent = `
                        <div style="text-align: left;">
                            <h3>Relatório disciplinar</h3>
                            <strong>Nome:</strong> ${studentName}<br>
                            <strong>Data:</strong> ${formatarData(new Date())}<br>
                            <strong>Assunto:</strong> ${reportContentText}<br>
                            <strong>Suspenso:</strong> ${suspended ? 'Sim' : 'Não'}<br>
                            <strong>Convocar o responsável:</strong> ${callParents ? 'Sim' : 'Não'}<br>
                            ${callParents && parentsMeeting ? `<strong>Dia da reunião com o responsável:</strong> ${formatarDataHora(parentsMeeting)}<br>` : ''}
                            <br>
                            <div style="text-align: left;">
                                ${data.report ? `<div style="text-align: left;">${data.report}</div>` : 'Nenhum relatório detalhado retornado.'}
                            </div>
                            <div style="background-color: #f0f7f0; color: #2e8b57; padding: 10px; margin-top: 15px; border-radius: 5px; text-align: center; font-weight: bold;">
                                Relatório Salvo
                            </div>
                        </div>
                    `;
                    // Assumindo que sua função showPopup retorna uma Promise quando fechada
                    await showPopup(popupContent || 'Relatório enviado com sucesso.');
        
                } catch (error) {
                    console.error(`Erro ao enviar relatório manual para o aluno ${studentId}:`, error);
                    hideLoading();
                    await showPopup('Erro ao enviar relatório.');
                } finally {
                    studentsProcessed++;
                    if (studentsProcessed === numStudents) {
                        window.location.reload(); // Atualiza a página após o último aluno
                    }
                }
            } else {
                console.warn("Não foi possível encontrar o studentId para uma linha da tabela (manual).");
                studentsProcessed++;
                if (studentsProcessed === numStudents) {
                    window.location.reload(); 
                }
            } 
        }
    }
    loadTodayReports();
});

        function fetchDisciplinaryOptions() {
            fetch('/reports/disciplinary-options') // Rota do hubescolar
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro na requisição: ${response.status}`);
                    }
                    return response.json();
                })
                .then(options => {
                    const disciplinaryOptionsSelect = document.getElementById('report-form-disciplinary-options');
                    const disciplinaryLevelRadios = document.querySelectorAll('input[name="disciplinary-level"]');
        
                    function populateOptions(level) {
                        disciplinaryOptionsSelect.innerHTML = '<option value="">Selecione uma opção</option>';
                        if (options[level]) {
                            options[level].forEach(optionData => { // 'optionData' agora é o objeto { actIndex, text }
                                const optionElement = document.createElement('option');
                                optionElement.value = optionData.text; // O valor da opção será o texto
                                optionElement.textContent = optionData.text; // O texto visível da opção
                                optionElement.dataset.actIndex = optionData.actIndex; // Armazenamos o actIndex como um atributo 'data-'
                                disciplinaryOptionsSelect.appendChild(optionElement);
                            });
                        }
                    }
        
                    // Event listener para os botões de rádio de nível disciplinar
                    disciplinaryLevelRadios.forEach(radio => {
                        radio.addEventListener('change', function() {
                            populateOptions(this.value);
                        });
                    });
        
                    // Popula as opções iniciais (por exemplo, o nível que estiver marcado por padrão)
                    const defaultCheckedRadio = Array.from(disciplinaryLevelRadios).find(radio => radio.checked);
                    if (defaultCheckedRadio) {
                        populateOptions(defaultCheckedRadio.value);
                    }
        
                })
                .catch(error => {
                    console.error('Erro ao buscar opções de faltas disciplinares:', error);
                    const disciplinaryOptionsSelect = document.getElementById('report-form-disciplinary-options');
                    const errorOption = document.createElement('option');
                    errorOption.textContent = 'Erro ao carregar opções';
                    disciplinaryOptionsSelect.appendChild(errorOption);
                    disciplinaryOptionsSelect.disabled = true;
                });
        }
        function formatarData(date) {
            const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
            return new Date(date).toLocaleDateString('pt-BR', options);
        }
        
        function formatarDataHora(dateTime) {
            const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(dateTime).toLocaleDateString('pt-BR', options);
        }
        
        // Função melhorada para formatar número de telefone
        function formatPhone(phone) {
            if (!phone) return '';
            
            // Remover caracteres não numéricos
            const cleaned = phone.replace(/\D/g, '');
            
            // Se o número já começa com 55 (código do Brasil), considerar como já tendo código de país
            if (cleaned.startsWith('55') && cleaned.length >= 12) {
                // Formato: +55 (DDD) XXXXX-XXXX
                const countryCode = cleaned.substring(0, 2);
                const ddd = cleaned.substring(2, 4);
                
                // Verificar se o resto do número tem 9 ou 8 dígitos
                if (cleaned.length >= 13) {
                    // Número com 9 dígitos (formato móvel atual)
                    return `+${countryCode} (${ddd}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
                } else {
                    // Número com 8 dígitos (formato fixo ou móvel antigo)
                    return `+${countryCode} (${ddd}) ${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
                }
            } 
            // Se o número não começa com 55, assumir que é um número brasileiro sem código de país
            else if (cleaned.length >= 10) {
                // Extrair o DDD (primeiros 2 dígitos)
                const ddd = cleaned.substring(0, 2);
                
                // Verificar se o resto do número tem 9 ou 8 dígitos
                if (cleaned.length >= 11) {
                    // Número com 9 dígitos (formato móvel atual)
                    return `+55 (${ddd}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
                } else {
                    // Número com 8 dígitos (formato fixo ou móvel antigo)
                    return `+55 (${ddd}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
                }
            } 
            // Para outros formatos, apenas adicionar +55 na frente
            else {
                return `+55 ${cleaned}`;
            }
        }
        
        // Atualizar a função loadTodayReports com uma solução mais simples
        async function loadTodayReports() {
            try {
                showLoading();
                
                const now = new Date();
                const today = now.toISOString().split('T')[0]; // "2025-05-19"
                
                console.log("Buscando relatórios para o dia:", today);
                
                // Usar apenas a data sem hora para evitar problemas
                const response = await fetch(`/reports/list?date=${today}`);

                if (!response.ok) {
                    throw new Error(`Falha ao carregar relatórios: ${response.status}`);
                }

                const data = await response.json();
                console.log("Relatórios carregados:", data.reports?.length || 0);
                
                // Resto do código permanece igual...
                const reportsTable = document.getElementById('reports-table-selected');
                const reportsTableTitle = document.querySelector('.reports-table-title');
                const tbody = document.getElementById('reports-table-selected-list');

                // Limpar tabela existente
                tbody.innerHTML = '';

                if (data.reports && data.reports.length > 0) {
                    // Mostrar título e tabela
                    reportsTableTitle.style.display = 'block';
                    reportsTable.style.display = 'table';

                    // Preencher tabela com relatórios
                    data.reports.forEach(report => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${report.studentName || 'Nome não disponível'}</td>
                            <td>${report.studentClass || 'Turma não disponível'}</td>
                            <td>${report.reportLevel || 'Não classificado'}</td>
                            <td>
                                <button class="view-report-btn" data-report-id="${report.id}">
                                    👁️ Ver
                                </button>
                                <button class="delete-report-btn" data-report-id="${report.id}">
                                    🗑️ Excluir
                                </button>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });

                    // Adicionar event listeners para os botões
                    document.querySelectorAll('.view-report-btn').forEach(btn => {
                        btn.addEventListener('click', () => viewReport(btn.dataset.reportId));
                    });

                    document.querySelectorAll('.delete-report-btn').forEach(btn => {
                        btn.addEventListener('click', () => deleteReport(btn.dataset.reportId));
                    });
                } else {
                    // Ocultar título e tabela se não houver relatórios
                    reportsTableTitle.style.display = 'none';
                    reportsTable.style.display = 'none';
                }
                
                hideLoading();
            } catch (error) {
                console.error('Erro ao carregar relatórios:', error);
                showPopup('Erro ao carregar relatórios do dia: ' + error.message);
                hideLoading();
            }
        }
        
        // Função para visualizar relatório (modificada para buscar telefone do responsável)
        async function viewReport(reportId) {
            try {
                showLoading();
                
                // Buscar dados do relatório
                const response = await fetch(`/reports/list?id=${reportId}`);

                if (!response.ok) throw new Error('Falha ao carregar relatório');

                const data = await response.json();
                const report = data.reports[0];

                if (!report) throw new Error('Relatório não encontrado');
                
                // Buscar informações completas do aluno para obter o telefone
                let studentPhone = null;
                try {
                    const studentResponse = await fetch(`/users/list/${report.studentId}`);
                    if (studentResponse.ok) {
                        const studentData = await studentResponse.json();
                        // Verificar se o telefone existe e tem um formato válido
                        if (studentData && studentData.phone) {
                            studentPhone = studentData.phone;
                            console.log(`Telefone encontrado para o aluno ${report.studentName}: ${studentPhone}`);
                        }
                    }
                } catch (error) {
                    console.warn(`Erro ao buscar dados do aluno ${report.studentId}:`, error);
                }
                
                // Verificar se o relatório já tem uma mensagem WhatsApp associada
                let whatsappStatusHtml = '';

                if (report.deliveryMethod === 'whatsapp' && report.status === 'delivered') {
                    // Se foi entregue por WhatsApp, mostrar o status mesmo que não tenha messageId
                    const messageId = report.deliveryConfirmation || 'unknown-' + Date.now();
                    
                    // Verificar o status atual da mensagem
                    let status = 'sent';
                    if (report.deliveryConfirmation) {
                        try {
                            status = await messageTracker.checkMessageStatus(messageId);
                            console.log(`Status atual da mensagem ${messageId}: ${status}`);
                        } catch (err) {
                            console.warn(`Erro ao verificar status da mensagem ${messageId}:`, err);
                        }
                    }
                    
                    // Formatar uma hora legível para a entrega
                    const deliveredAtFormatted = report.deliveredAt 
                        ? formatarDataHora(report.deliveredAt)
                        : formatarDataHora(new Date());
                    
                    whatsappStatusHtml = `
                        <div class="whatsapp-status">
                            <p><strong>Status da mensagem:</strong> 
                                <span class="message-status" data-message-id="${messageId}">
                                    ${report.deliveryConfirmation 
                                       ? messageTracker.getStatusHTML(status)
                                       : '<span class="status-badge sent">Enviado <i class="fas fa-check"></i></span>'}
                                </span>
                            </p>
                            <p><small>Enviado em: ${deliveredAtFormatted}</small></p>
                        </div>
                    `;
                    
                    // Registrar callback para atualização apenas se tiver messageId válido
                    if (report.deliveryConfirmation) {
                        messageTracker.onStatusChange(messageId, (newStatus) => {
                            const statusElement = document.querySelector(`[data-message-id="${messageId}"]`);
                            if (statusElement) {
                                statusElement.innerHTML = messageTracker.getStatusHTML(newStatus);
                            }
                        });
                    }
                }

                function formatReportLevel(level) {
                    if (!level) return "Não classificado";
                    
                    switch(level.toLowerCase()) {
                        case 'infracionais':
                            return "Ato Infracional";
                        case 'leves':
                            return "Leve";
                        case 'graves':
                            return "Grave";
                        default:
                            return level; // Retorna o valor original caso não seja um dos valores esperados
                    }
                }

                // Preparar texto resumido do relatório para WhatsApp
                const whatsappText = 
                    `*Relatório Disciplinar*\n\n` +
                    `Aluno: ${report.studentName}\n` +
                    `Turma: ${report.studentClass}\n` +
                    `Data: ${new Date(report.createdAt).toLocaleDateString()}\n` +
                    `Nível: ${formatReportLevel(report.reportLevel)}\n\n` +
                    `${report.suspended ? `🚨 Aluno suspenso por ${report.suspensionDuration} dias.\n` : ''}` +
                    `${report.callParents ? `📅 Reunião agendada para ${new Date(report.parentsMeeting).toLocaleString()}.\n\n` : '\n'}` +
                    `Detalhes: ${report.content.replace(/<[^>]*>?/gm, '')}`;
                
                
                const showWhatsAppButton = !(report.deliveryMethod === 'whatsapp' && report.status === 'delivered');
                
                                // Na função viewReport, onde se gera o HTML para a seção de WhatsApp:
                
                // Verificar se há múltiplos números de telefone
                let phoneNumbers = [];
                if (studentPhone) {
                    // Dividir a string se contiver o separador |
                    phoneNumbers = studentPhone.includes('|') ? studentPhone.split('|') : [studentPhone];
                }
                
                // Gerar HTML para botões de WhatsApp baseado nos números disponíveis
                const whatsappButtonsHtml = phoneNumbers.map((phone, index) => {
                    // Formatar cada número para exibição
                    const formattedPhone = formatPhone(phone.trim());
                    // Gerar identificador único para este botão
                    const buttonId = `send-whatsapp-report-${index}`;
                    
                    return showWhatsAppButton ? `
                        <button id="${buttonId}" class="btn btn-success whatsapp-send-button" 
                                data-report-id="${reportId}" 
                                data-student-id="${report.studentId}"
                                data-student-name="${report.studentName}"
                                data-phone="${phone.trim()}"
                                data-message="${encodeURIComponent(whatsappText)}"
                                style="background-color: #25D366; border-color: #25D366; padding: 6px 10px; margin-bottom: 5px; width: 100%;">
                            <i class="fab fa-whatsapp" style="margin-right: 5px;"></i> Enviar para Responsável ${phoneNumbers.length > 1 ? `(${formattedPhone})` : formattedPhone}
                        </button>
                    ` : '';
                }).join('');
                
                // Montar a seção de WhatsApp
                const whatsappSectionHtml = phoneNumbers.length > 0 ? `
                    <div class="whatsapp-section" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                        ${phoneNumbers.length > 1 ? `<p><strong>Selecione um número para enviar o relatório:</strong></p>` : ''}
                        ${whatsappButtonsHtml}
                        ${whatsappStatusHtml}
                    </div>
                ` : `
                    <div class="whatsapp-section" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                        <p>⚠️ Número de telefone do responsável não cadastrado</p>
        
                        <div class="phone-add-form" style="margin: 10px 0;">
                            <div class="input-group mb-2">
                                <input type="text" id="quick-phone-input" class="form-control" placeholder="(XX) XXXXXXXXX">
                                <button id="quick-phone-add-btn" class="btn btn-success" data-student-id="${report.studentId}" data-report-id="${reportId}">
                                    <i class="fas fa-plus"></i> Adicionar
                                </button>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                <span>Exemplo: (27) 999999999</span>
                                <a href="/users/profile/${report.studentId}" target="_blank">Editar cadastro completo</a>
                            </div>
                        </div>
                    </div>
                `;

                const popupContent = `
                    <div class="report-detail" style="text-align: left; overflow-x: auto; max-width: 80vw;">
                        <h2>Relatório Detalhado</h2>
                        <h3>Detalhes do Relatório</h3>
                        <p><strong>Aluno:</strong> ${report.studentName}</p>
                        <p><strong>Turma:</strong> ${report.studentClass}</p>
                        <p><strong>Nível:</strong> ${report.reportLevel}</p>
                        <p><strong>Conteúdo:</strong></p>
                        <div class="report-content">${report.content}</div>
                        ${report.suspended ? `<p><strong>Suspenso por:</strong> ${report.suspensionDuration} dias</p>` : ''}
                        ${report.callParents ? `<p><strong>Reunião agendada:</strong> ${new Date(report.parentsMeeting).toLocaleString()}</p>` : ''}
                        ${report.parentResponse ? `
                        <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                            <p><strong>Resposta do Responsável:</strong></p>
                            <div class="parent-response" style="background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${report.parentResponse}</div>
                        </div>` : ''}
                        
                        ${whatsappSectionHtml}
                    </div>
                `;

                hideLoading();
                showPopup(popupContent);
                
                // Adicionar event listener para o botão de WhatsApp após o popup ser mostrado
                const sendWhatsAppButton = document.getElementById('send-whatsapp-report');
                if (sendWhatsAppButton) {
                    sendWhatsAppButton.addEventListener('click', sendReportWhatsApp);
                }
                
                // Após o popup ser exibido:
                phoneNumbers.forEach((phone, index) => {
                    const buttonId = `send-whatsapp-report-${index}`;
                    const sendButton = document.getElementById(buttonId);
                    if (sendButton) {
                        sendButton.addEventListener('click', sendReportWhatsApp);
                    }
                });
                
                // Adicionar event listener para o botão de adicionar telefone
                const quickAddButton = document.getElementById('quick-phone-add-btn');
                if (quickAddButton) {
                    quickAddButton.addEventListener('click', async function() {
                        const studentId = this.dataset.studentId;
                        const reportId = this.dataset.reportId;
                        const phoneInput = document.getElementById('quick-phone-input');
                        const phone = phoneInput.value.trim();
                        
                        // Validar o número de telefone
                        if (!phone || phone.length < 10) {
                            showNotification('Por favor, insira um número de telefone válido', 'error');
                            phoneInput.classList.add('error-field');
                            setTimeout(() => phoneInput.classList.remove('error-field'), 1000);
                            return;
                        }
                        
                        try {
                            // Desabilitar o botão durante o processamento
                            this.disabled = true;
                            const originalButtonText = this.innerHTML;
                            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                            
                            // Usar a rota de edição existente
                            const response = await fetch(`/users/edit/${studentId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ phone })
                            });
                            
                            if (!response.ok) {
                                throw new Error('Falha ao atualizar telefone');
                            }
                            
                            // Notificar usuário sobre o sucesso
                            showNotification('Telefone adicionado com sucesso!');
                            
                            // Recarregar o relatório para mostrar o botão de WhatsApp
                            await viewReport(reportId);
                            
                        } catch (error) {
                            console.error('Erro ao adicionar telefone:', error);
                            this.disabled = false;
                            this.innerHTML = originalButtonText;
                            showNotification('Erro ao salvar telefone: ' + error.message, 'error');
                        }
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar detalhes do relatório:', error);
                hideLoading();
                showPopup('Erro ao carregar detalhes do relatório');
            }
        }
        
        // Função para excluir relatório
        async function deleteReport(reportId) {
            if (!reportId) {
                showNotification('ID do relatório não especificado', 'error');
                return;
            }
            
            // Confirmar exclusão com o usuário
            const confirmDelete = window.confirm('Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.');
            
            if (!confirmDelete) {
                return;
            }
            
            try {
                showLoading();
                
                // Fazer requisição para deletar o relatório
                const response = await fetch(`/reports/delete/${reportId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Erro ao excluir relatório: ${response.status}`);
                }
                
                // Exibir notificação de sucesso
                showNotification('Relatório excluído com sucesso');
                
                // Recarregar a lista de relatórios
                loadTodayReports();
                
            } catch (error) {
                console.error('Erro ao excluir relatório:', error);
                showNotification(`Erro ao excluir relatório: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        }
        
        // Função para enviar relatório por WhatsApp (atualizada com proteção contra cliques múltiplos)
        async function sendReportWhatsApp(event) {
            const button = event.currentTarget;
            
            // Impedir cliques múltiplos - verificação imediata
            if (button.disabled || button.dataset.processing === 'true') {
                console.log('Botão já está sendo processado, ignorando clique adicional');
                return;
            }
            
            // Marcar que estamos processando este botão
            button.disabled = true;
            button.dataset.processing = 'true';
            
            const reportId = button.dataset.reportId;
            const phone = button.dataset.phone;
            const message = decodeURIComponent(button.dataset.message);
            const studentName = button.dataset.studentName;
            
            // Mostrar spinner no botão para feedback
            const originalButtonHtml = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando conexão...';
            
            try {
                // Obter o ID da escola atual do usuário
                const schoolId = document.querySelector('meta[name="school-id"]')?.content || '1';
                
                // Verificar status da sessão antes de enviar a mensagem
                let sessionReady = false;
                let attemptsRemaining = 3; // Tentar até 3 vezes
                
                while (!sessionReady && attemptsRemaining > 0) {
                    try {
                        // Verificar se o cliente está pronto
                        const statusResponse = await fetch('/whatsapp/messages/status?sessionId=' + schoolId);
                        const statusData = await statusResponse.json();
                        
                        if (statusData.status === 'ready' || statusData.connected === true) {
                            sessionReady = true;
                            console.log('Cliente WhatsApp pronto:', statusData);
                        } else {
                            // Se não estiver pronto, aguardar e mostrar status
                            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Conectando... (${statusData.status || 'iniciando'})`;
                            
                            // Mostrar notificação informativa
                            showNotification(`Conectando ao WhatsApp... ${attemptsRemaining} tentativas restantes`, 'info');
                            
                            // Aguardar 5 segundos antes de tentar novamente
                            await new Promise(resolve => setTimeout(resolve, 5000));
                            attemptsRemaining--;
                        }
                    } catch (err) {
                        console.warn('Erro ao verificar status da sessão:', err);
                        attemptsRemaining--;
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
                
                if (!sessionReady) {
                    throw new Error("WhatsApp não está pronto. Tente novamente em alguns instantes.");
                }
                
                // Cliente está pronto, atualizar botão
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                
                // Enviar mensagem usando MessageTracker
                const result = await messageTracker.sendMessage(phone, message, {
                    sessionId: schoolId,
                    referenceId: reportId,
                    referenceType: 'report'
                });
                
                // Atualizar o relatório com os dados de entrega
                await messageTracker.updateReportDelivery(reportId, result.messageId, phone);
                
                // Adicionar elemento de status após o botão
                const statusContainer = document.createElement('div');
                statusContainer.className = 'whatsapp-status';
                statusContainer.innerHTML = `
                    <p><strong>Status da mensagem:</strong> 
                        <span class="message-status" data-message-id="${result.messageId}">
                            ${messageTracker.getStatusHTML('sent')}
                        </span>
                    </p>
                `;
                
                // Inserir o container de status após o botão
                button.parentNode.insertBefore(statusContainer, button.nextSibling);
                
                // Registrar callback para atualizar status
                messageTracker.onStatusChange(result.messageId, (status) => {
                    const statusElement = document.querySelector(`[data-message-id="${result.messageId}"]`);
                    if (statusElement) {
                        statusElement.innerHTML = messageTracker.getStatusHTML(status);
                    }
                });
                
                // Substituir o botão por texto permanente de sucesso - 
                // Importante: nunca reativar este botão específico
                button.innerHTML = '<i class="fas fa-check"></i> Enviado';
                button.className = 'btn btn-secondary';
                button.disabled = true;
                button.dataset.processing = 'false'; // Marcar como não processando, embora permaneça desativado
                
                // Remover o listener de evento original do botão para garantia extra
                button.removeEventListener('click', sendReportWhatsApp);
                
                // Notificar usuário
                showNotification(`Mensagem enviada para o responsável de ${studentName}`);
                
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                
                // Restaurar botão original com um pequeno delay adicional para segurança
                setTimeout(() => {
                    button.innerHTML = originalButtonHtml;
                    button.disabled = false;
                    button.dataset.processing = 'false'; // Resetar flag de processamento
                    showNotification('Erro ao enviar mensagem: ' + error.message, 'error');
                }, 1000);
            }
        }
        
        // Função para exibir notificação temporária
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = message;
            document.body.appendChild(notification);
            
            // Mostrar a notificação
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Remover após 5 segundos
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 5000);
        }
        updateReportFieldsVisibility();
        fetchDisciplinaryOptions();
        loadTodayReports();
    }
});

// Adicione este CSS para o item destacado
const style = document.createElement('style');
style.textContent = `
    #report-form-autocomplete-results li.autocomplete-highlighted {
        background-color: var(--primary-color); /* Use sua cor primária */
        color: var(--form-bg); /* Cor do texto contrastante */
    }
`;
document.head.appendChild(style);

const validationStyles = document.createElement('style');
validationStyles.textContent = `
    .error-field {
        border: 2px solid #ff3333 !important;
        background-color: #fff8f8 !important;
        animation: errorShake 0.4s linear;
    }
    
    @keyframes errorShake {
        0% { margin-left: 0; }
        25% { margin-left: -5px; }
        50% { margin-left: 5px; }
        75% { margin-left: -5px; }
        100% { margin-left: 0; }
    }
    
    .notification.error {
        background-color: #ff3333;
        color: white;
        box-shadow: 0 4px 8px rgba(255, 51, 51, 0.2);
    }
`;
document.head.appendChild(validationStyles);

// Após adicionar o event listener do botão, adicionar função de máscara para o input

// Adicionar máscara ao campo de telefone
const phoneInput = document.getElementById('quick-phone-input');
if (phoneInput) {    
    phoneInput.addEventListener('input', function(e) {
        // Remover tudo que não for número
        let value = this.value.replace(/\D/g, '');
        
        // Aplicar máscara (XX) XXXXXXXXX (sem hífen)
        if (value.length <= 2) {
            // Apenas DDD
            this.value = value.length ? `(${value}` : value;
        } else {
            // DDD + número do telefone (sem hífen)
            this.value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
        }
    });
}