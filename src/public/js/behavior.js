document.addEventListener('DOMContentLoaded', function() {
    const isBehavior = window.location.pathname.includes("behavior");
    if (isBehavior) {
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

        function displayAutocompleteResults(students) {
            autocompleteResultsList.innerHTML = '';
            highlightedIndex = -1; // Resetar o índice ao exibir novos resultados

            if (students && students.length > 0) {
                students.forEach((student, index) => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${student.name} (${student.userClass || 'Sem turma'})`;
                    listItem.dataset.studentId = student.id;
                    listItem.dataset.studentName = student.name;
                    listItem.dataset.studentClass = student.userClass || 'Sem turma';
                    listItem.addEventListener('click', addStudentToSelection);
                    autocompleteResultsList.appendChild(listItem);
                });
            } else if (searchStudentInput.value.trim()) {
                const listItem = document.createElement('li');
                listItem.textContent = 'Nenhum aluno encontrado';
                autocompleteResultsList.appendChild(listItem);
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

        submitReportButton.addEventListener('click', async function() {
            const selectedStudentsTable = document.getElementById('report-form-selected-students-list');
            const studentRows = selectedStudentsTable.querySelectorAll('tr');
            const numStudents = studentRows.length;
            let studentsProcessed = 0;

        
            if (toggleIA.checked) {
                const topics = document.getElementById('report-form-ia-summary').value.trim();
                if (!topics) {
                    alert('Por favor, forneça um resumo do ocorrido para a IA.');
                    return;
                }
        
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
        
        async function loadTodayReports() {
            try {
                // Obter a data de hoje no formato YYYY-MM-DD
                const today = new Date().toISOString().split('T')[0];
                
                const response = await fetch(`/reports/list?startDate=${today}&endDate=${today}`);
        
                if (!response.ok) {
                    throw new Error('Falha ao carregar relatórios');
                }
        
                const data = await response.json();
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
                            <td>${report.studentName}</td>
                            <td>${report.studentClass}</td>
                            <td>${report.reportLevel}</td>
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
        
            } catch (error) {
                console.error('Erro ao carregar relatórios:', error);
                showPopup('Erro ao carregar relatórios do dia');
            }
        }
        
        // Função para visualizar relatório
        async function viewReport(reportId) {
            try {
                const response = await fetch(`/reports/list?id=${reportId}`);
        
                if (!response.ok) throw new Error('Falha ao carregar relatório');
        
                const data = await response.json();
                const report = data.reports[0];
        
                if (!report) throw new Error('Relatório não encontrado');
        
                const popupContent = `
                    <div class="report-detail" style="text-align: left; overflow-x: auto;" "max-width: 120vw;">
                        <h2>Relatório Detalhado</h2>
                        <h3>Detalhes do Relatório</h3>
                        <p><strong>Aluno:</strong> ${report.studentName}</p>
                        <p><strong>Turma:</strong> ${report.studentClass}</p>
                        <p><strong>Nível:</strong> ${report.reportLevel}</p>
                        <p><strong>Conteúdo:</strong></p>
                        <div class="report-content">${report.content}</div>
                        ${report.suspended ? `<p><strong>Suspenso por:</strong> ${report.suspensionDuration} dias</p>` : ''}
                        ${report.callParents ? `<p><strong>Reunião agendada:</strong> ${new Date(report.parentsMeeting).toLocaleString()}</p>` : ''}
                    </div>
                `;
        
                showPopup(popupContent);
            } catch (error) {
                showPopup('Erro ao carregar detalhes do relatório');
            }
        }
        
        // Função para deletar relatório
        async function deleteReport(reportId) {
            if (!confirm('Tem certeza que deseja excluir este relatório?')) {
                return;
            }
        
            try {
                const response = await fetch(`/reports/delete/${reportId}`, {
                    method: 'DELETE'
                });
        
                if (!response.ok) throw new Error('Falha ao excluir relatório');
        
                // Recarregar a tabela após exclusão
                loadTodayReports();
                showPopup('Relatório excluído com sucesso');
        
            } catch (error) {
                console.error('Erro ao excluir relatório:', error);
                showPopup('Erro ao excluir relatório');
            }
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