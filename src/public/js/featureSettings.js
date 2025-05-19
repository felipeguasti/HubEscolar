document.addEventListener('DOMContentLoaded', function() {
    const isFeatureSettings = window.location.pathname.includes("features/settings");
    
    if (isFeatureSettings) {
        // 1. Obter todas as referências a elementos uma única vez
        const userSearchInput = document.getElementById('user-search');
        const autocompleteResultsList = document.querySelector('.feature-form-autocomplete-results');
        const selectedUsersListBody = document.getElementById('feature-form-selected-users-list');
        const selectedUsersTable = document.getElementById('feature-form-selected-users');
        const roleFilter = document.getElementById('roleFilter'); // Dropdown para filtrar por cargo
        const loggedUserRole = document.getElementById('userRole')?.value; // Hidden input com o papel do usuário logado
        const userDistrict = document.getElementById('userDistrict');
        const districtContainer = document.getElementById('districtContainer');
        const schoolContainer = document.getElementById('schoolContainer');
        
        // Elementos para o modo de atribuição individual/em lote
        const assignmentModeToggle = document.getElementById('assignmentModeToggle');
        const individualModeLabel = document.getElementById('individualModeLabel');
        const batchModeLabel = document.getElementById('batchModeLabel');
        const individualTableHead = document.getElementById('individual-table-head');
        const batchTableHead = document.getElementById('batch-table-head');
        const individualSearchGroup = document.getElementById('individualSearchGroup');
        const batchSearchGroup = document.getElementById('batchSearchGroup');
        const batchSearchButton = document.getElementById('batchSearchButton');
        
        // Variáveis de estado
        let selectedUsers = [];
        let highlightedIndex = -1;
        let isInBatchMode = false;
        
        // 2. Inicialize o sistema
        console.log('Inicializando sistema de features');
        initializeFeatureHandlers();
        initializeAssignmentMode();
        initializeRoleBasedFields();
        
        // Função para inicializar campos baseados no papel do usuário LOGADO
        function initializeRoleBasedFields() {
            console.log('Papel do usuário logado:', loggedUserRole);
            
            if (!districtContainer || !schoolContainer) {
                console.error('Containers de distrito/escola não encontrados');
                return;
            }
            
            // Obter valores fixos
            const districtHidden = document.getElementById('userDistrictHidden');
            const schoolHidden = document.getElementById('userSchoolHidden');
            const fixedDistrictId = districtHidden?.value;
            const fixedSchoolId = schoolHidden?.value;
            
            // Salvar para uso nas funções de busca
            window.userFixedDistrict = fixedDistrictId;
            window.userFixedSchool = fixedSchoolId;
            
            // Aplicar visibilidade baseada no papel do usuário LOGADO
            if (loggedUserRole === 'Master') {
                // Master vê ambos os campos
                districtContainer.style.display = 'block';
                schoolContainer.style.display = 'block';
                
                // Configurar evento para carregar escolas
                if (userDistrict) {
                    userDistrict.addEventListener('change', function() {
                        if (this.value) loadSchoolsByDistrict(this.value);
                    });
                    
                    // Carregar escolas iniciais
                    if (userDistrict.value) loadSchoolsByDistrict(userDistrict.value);
                }
            } 
            else if (loggedUserRole === 'Inspetor') {
                // Inspetor não vê distrito mas vê escola
                districtContainer.style.display = 'none';
                schoolContainer.style.display = 'block';
                
                // Carregar escolas do distrito fixo
                if (fixedDistrictId) loadSchoolsByDistrict(fixedDistrictId);
            } 
            else {
                // Outros usuários não veem ambos
                districtContainer.style.display = 'none';
                schoolContainer.style.display = 'none';
            }
        }
        
        // Função para inicializar e configurar o toggle de modo de atribuição
        function initializeAssignmentMode() {
            if (!assignmentModeToggle) return;
            
            // Configurar evento de mudança para o toggle
            assignmentModeToggle.addEventListener('change', function() {
                isInBatchMode = this.checked;
                toggleAssignmentMode();
            });
            
            // Inicializar o modo correto
            toggleAssignmentMode();
        }
        
        // Função para alternar entre modos individual e em lote
        function toggleAssignmentMode() {
            const loggedUserRole = document.getElementById('feature-form-user-role')?.value;
            if (!loggedUserRole) {
                console.error('Papel do usuário não encontrado');
                return;
            }
            if (isInBatchMode) {
                // Modo em lote
                if (loggedUserRole === 'Master') {
                    districtContainer.style.display = 'block';
                    schoolContainer.style.display = 'block';
                }
                individualSearchGroup.style.display = 'none';
                batchSearchGroup.style.display = 'block';
                
                if (individualTableHead) individualTableHead.style.display = 'none';
                if (batchTableHead) batchTableHead.style.display = 'table-header-group';
                
                if (individualModeLabel) individualModeLabel.classList.remove('active');
                if (batchModeLabel) batchModeLabel.classList.add('active');
                
                // Limpar seleções anteriores
                selectedUsers = [];
                if (selectedUsersListBody) selectedUsersListBody.innerHTML = '';
                if (selectedUsersTable) selectedUsersTable.style.display = 'none';
            } else {
                // Modo individual
                districtContainer.style.display = 'none';
                schoolContainer.style.display = 'none';
                individualSearchGroup.style.display = 'block';
                batchSearchGroup.style.display = 'none';
                
                if (individualTableHead) individualTableHead.style.display = 'table-header-group';
                if (batchTableHead) batchTableHead.style.display = 'none';
                
                if (individualModeLabel) individualModeLabel.classList.add('active');
                if (batchModeLabel) batchModeLabel.classList.remove('active');
                
                // Limpar seleções anteriores
                selectedUsers = [];
                if (selectedUsersListBody) selectedUsersListBody.innerHTML = '';
                if (selectedUsersTable) selectedUsersTable.style.display = 'none';
            }
        }
        
        // Se tivermos o botão de busca em lote, adicionamos o evento
        if (batchSearchButton) {
            batchSearchButton.addEventListener('click', searchUsersByGroup);
        }
        
        // Função para buscar usuários em grupo (modo em lote) - Corrigida
        async function searchUsersByGroup() {
            const selectedRole = document.getElementById('userRole').value;
            if (!selectedRole) {
                showPopup('Por favor, selecione um cargo.');
                return;
            }
            
            // Coletar o papel do usuário logado do campo oculto correto
            const loggedUserRole = document.getElementById('feature-form-user-role').value;
            
            // Determinar quais valores usar para distrito e escola
            let districtId, schoolId;
            
            if (loggedUserRole === 'Master') {
                // Master: Usar valores dos campos
                districtId = document.getElementById('userDistrict').value;
                schoolId = document.getElementById('userSchool').value;
            } else if (loggedUserRole === 'Inspetor') {
                // Inspetor: Usar distrito fixo e escola selecionada
                districtId = document.getElementById('userDistrictHidden').value;
                schoolId = document.getElementById('userSchool').value;
            } else {
                // Outros: Usar ambos os valores fixos
                districtId = document.getElementById('userDistrictHidden').value;
                schoolId = document.getElementById('userSchoolHidden').value;
            }

            console.log('DistrictId e SchoolId usados:', districtId, schoolId);
            
            try {
                // Mostrar loading
                const batchSearchButton = document.getElementById('batchSearchButton');
                if (batchSearchButton) {
                    batchSearchButton.disabled = true;
                    batchSearchButton.innerHTML = 'Buscando...';
                }
                
                // Construir os parâmetros da URL
                const params = new URLSearchParams();
                if (districtId) params.append('districtId', districtId);
                if (schoolId) params.append('schoolId', schoolId);
                params.append('role', selectedRole);
                
                console.log('Parâmetros da consulta:', params.toString());
                
                // Usando a rota correta do microserviço users-service
                const response = await fetch(`/users/filter?${params.toString()}`);
                
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Aqui está a correção: passando os valores de distrito e escola para a função
                displayBatchResults(data, selectedRole, districtId, schoolId);
                
            } catch (error) {
                console.error('Erro na busca em lote:', error);
                showPopup('Erro ao buscar usuários. Por favor, tente novamente.');
            } finally {
                // Restaurar o botão
                const batchSearchButton = document.getElementById('batchSearchButton');
                if (batchSearchButton) {
                    batchSearchButton.disabled = false;
                    batchSearchButton.innerHTML = 'Buscar Usuários';
                }
            }
        }

        // Função para exibir resultados da busca em lote (atualizada com botão de remoção)
        function displayBatchResults(data, role, districtId, schoolId) {
            const selectedUsersTable = document.getElementById('feature-form-selected-users');
            const selectedUsersList = document.getElementById('feature-form-selected-users-list');
            
            if (!selectedUsersTable || !selectedUsersList) return;
            
            // Limpar tabela
            selectedUsersList.innerHTML = '';
            
            // Se temos usuários
            if (data && data.users && data.users.length > 0) {
                const count = data.users.length;
                
                // Linha principal com contagem e ferramenta
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${role}</td>
                    <td>${count} usuários</td>
                    <td>
                        <select id="batchFeatureSelect" class="feature-dropdown">
                            <option value="">Selecione uma ferramenta</option>
                        </select>
                    </td>
                    <td class="action-buttons">
                        <button id="batchAssignButton" class="btn-add-feature" 
                                data-role="${role}" 
                                data-district="${districtId || ''}" 
                                data-school="${schoolId || ''}">
                            
                        </button>
                        <button id="batchRemoveButton" class="btn-remove-feature" 
                                data-role="${role}" 
                                data-district="${districtId || ''}" 
                                data-school="${schoolId || ''}">
                            <i class="fas fa-trash"></i>
                        </button>
                        <span id="batchAssignStatus"></span>
                    </td>
                `;
                selectedUsersList.appendChild(row);
                
                // Carregar ferramentas disponíveis
                loadFeatureOptions('batchFeatureSelect');
                
                // Adicionar linha de separação para a amostra
                if (count > 5) {
                    const sampleHeader = document.createElement('tr');
                    sampleHeader.className = 'sample-header';
                    sampleHeader.innerHTML = `<td colspan="4">Amostra de usuários (5 de ${count}):</td>`;
                    selectedUsersList.appendChild(sampleHeader);
                    
                    // Mostrar até 5 usuários como amostra
                    for (let i = 0; i < Math.min(5, count); i++) {
                        const user = data.users[i];
                        const sampleRow = document.createElement('tr');
                        sampleRow.className = 'sample-row';
                        sampleRow.innerHTML = `
                            <td colspan="2">${user.name}</td>
                            <td colspan="2">${user.email || '-'}</td>
                        `;
                        selectedUsersList.appendChild(sampleRow);
                    }
                }
                
                // Configurar botão de atribuição
                document.getElementById('batchAssignButton').addEventListener('click', function(e) {
                    // Garantir que estamos usando o botão, não um elemento filho
                    const btn = e.currentTarget;
                    const btnRole = btn.dataset.role;
                    const btnDistrict = btn.dataset.district;
                    const btnSchool = btn.dataset.school;
                    
                    console.log('Valores do botão de atribuição:', {
                        role: btnRole,
                        district: btnDistrict,
                        school: btnSchool
                    });
                    
                    assignFeatureToBatch(btnRole, btnDistrict, btnSchool);
                });
                
                // Configurar botão de remoção
                document.getElementById('batchRemoveButton').addEventListener('click', function(e) {
                    // Garantir que estamos usando o botão, não um elemento filho
                    const btn = e.currentTarget;
                    const btnRole = btn.dataset.role;
                    const btnDistrict = btn.dataset.district;
                    const btnSchool = btn.dataset.school;
                    
                    console.log('Valores do botão de remoção:', {
                        role: btnRole,
                        district: btnDistrict,
                        school: btnSchool
                    });
                    
                    removeFeatureFromBatch(btnRole, btnDistrict, btnSchool);
                });
                
                // Mostrar a tabela
                selectedUsersTable.style.display = 'table';
            } else {
                showPopup('Nenhum usuário encontrado com os critérios especificados.');
            }
        }

        // Função para carregar as opções de features disponíveis em um dropdown
        async function loadFeatureOptions(selectId) {
            const featureSelect = document.getElementById(selectId);
            if (!featureSelect) return;
            
            try {
                // Mostrar estado de carregamento
                featureSelect.disabled = true;
                featureSelect.innerHTML = '<option value="">Carregando...</option>';
                
                // Buscar ferramentas disponíveis
                const response = await fetch('/features/list');
                if (!response.ok) throw new Error('Erro ao carregar ferramentas');
                
                const features = await response.json();
                
                // Resetar o select
                featureSelect.innerHTML = '<option value="">Selecione uma ferramenta</option>';
                
                // Adicionar as features ao dropdown
                features.forEach(feature => {
                    const option = document.createElement('option');
                    option.value = feature.id;
                    option.textContent = feature.name;
                    featureSelect.appendChild(option);
                });
                
                // Habilitar o select novamente
                featureSelect.disabled = false;
            } catch (error) {
                console.error('Erro ao carregar ferramentas:', error);
                featureSelect.innerHTML = '<option value="">Erro ao carregar</option>';
                featureSelect.disabled = false;
            }
        }

        // Função para atribuir ferramenta em lote
        async function assignFeatureToBatch(role, districtId, schoolId) {
            const featureSelect = document.getElementById('batchFeatureSelect');
            if (!featureSelect || !featureSelect.value) {
                showPopup('Por favor, selecione uma ferramenta para atribuir.');
                return;
            }
            
            const featureId = featureSelect.value;
            const statusElem = document.getElementById('batchAssignStatus');
            const assignButton = document.getElementById('batchAssignButton');
            
            try {
                // Desabilitar o botão durante o processo
                if (assignButton) assignButton.disabled = true;
                if (statusElem) statusElem.innerHTML = '<span class="loading">Atribuindo...</span>';
                
                // Prepara os parâmetros para a requisição
                const params = {
                    featureId,
                    role: role || document.getElementById('userRole').value,
                    districtId,
                    schoolId
                };
                
                // Fazer a requisição para atribuir a ferramenta em lote
                const response = await fetch('/features/assign-batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(params)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    if (statusElem) statusElem.innerHTML = `<span class="success">Ferramenta atribuída a ${result.count || 'vários'} usuários</span>`;
                    showPopup(`Ferramenta atribuída com sucesso a ${result.count || 'vários'} usuários.`);
                } else {
                    throw new Error(result.error || 'Erro ao atribuir ferramenta em lote');
                }
            } catch (error) {
                console.error('Erro na atribuição em lote:', error);
                if (statusElem) statusElem.innerHTML = '<span class="error">Erro na atribuição</span>';
                showPopup('Erro ao atribuir ferramenta em lote. Por favor, tente novamente.');
            } finally {
                // Restaurar o botão
                if (assignButton) assignButton.disabled = false;
            }
        }

        // Função para remover ferramenta em lote
        async function removeFeatureFromBatch(role, districtId, schoolId) {
            const featureSelect = document.getElementById('batchFeatureSelect');
            if (!featureSelect || !featureSelect.value) {
                showPopup('Por favor, selecione uma ferramenta para remover.');
                return;
            }
            
            // Confirmação antes de prosseguir
            if (!confirm('Tem certeza que deseja remover esta ferramenta de todos os usuários encontrados?')) {
                return;
            }
            
            const featureId = featureSelect.value;
            const statusElem = document.getElementById('batchAssignStatus');
            const removeButton = document.getElementById('batchRemoveButton');
            
            try {
                // Desabilitar o botão durante o processo
                if (removeButton) removeButton.disabled = true;
                if (statusElem) statusElem.innerHTML = '<span class="loading">Removendo...</span>';
                
                // Prepara os parâmetros para a requisição
                const params = {
                    featureId,
                    role: role || document.getElementById('userRole').value,
                    districtId,
                    schoolId
                };
                
                // Fazer a requisição para remover a ferramenta em lote
                const response = await fetch('/features/remove-batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(params)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    if (statusElem) statusElem.innerHTML = `<span class="success">Ferramenta removida de ${result.count || 'vários'} usuários</span>`;
                    showPopup(`Ferramenta removida com sucesso de ${result.count || 'vários'} usuários.`);
                } else {
                    throw new Error(result.error || 'Erro ao remover ferramenta em lote');
                }
            } catch (error) {
                console.error('Erro na remoção em lote:', error);
                if (statusElem) statusElem.innerHTML = '<span class="error">Erro na remoção</span>';
                showPopup('Erro ao remover ferramenta em lote. Por favor, tente novamente.');
            } finally {
                // Restaurar o botão
                if (removeButton) removeButton.disabled = false;
            }
        }

        function initializeFeatureHandlers() {
            const modalContainer = document.querySelector('.modalContainer');
            const modal = document.getElementById('featureModal');
            const newFeatureBtn = document.getElementById('btn-new-feature');
            const featureForm = document.getElementById('featureForm');
            const closeBtn = modal.querySelector('.close');
        
            // Close button handlers
            [closeBtn, document.querySelector('.btn-cancel')]?.forEach(btn => {
                btn?.addEventListener('click', () => {
                    modalContainer.hidden = true;
                    modal.hidden = true;
                });
            });

            // New feature button handler
            newFeatureBtn?.addEventListener('click', () => {
                modalContainer.hidden = false;
                modal.hidden = false;
                handleNewFeature();
            });

            featureForm?.addEventListener('submit', handleFeatureSubmit);
            initializeTableActions();
        }
        
        function initializeTableActions() {
            // Edit buttons
            document.querySelectorAll('.btn-edit').forEach(button => {
                button.addEventListener('click', (e) => {
                    const featureId = e.target.dataset.id;
                    handleEditFeature(featureId);
                });
            });

            // Delete buttons
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', (e) => {
                    const featureId = e.target.dataset.id;
                    handleDeleteFeature(featureId);
                });
            });
        }
        
        async function handleNewFeature() {
            showLoading();
            try {
                const form = document.getElementById('featureForm');
                form.reset();
                form.dataset.mode = 'create';
                document.querySelector('.modal-content h2').textContent = 'Nova Ferramenta';
            } catch (error) {
                showPopup('Erro ao preparar formulário de nova feature');
            } finally {
                hideLoading();
            }
        }
        
        async function handleFeatureSubmit(e) {
            e.preventDefault();
            showLoading();
        
            const form = e.target;
            const isCreateMode = form.dataset.mode === 'create';
            const featureId = form.dataset.featureId;
        
            const featureData = {
                name: document.getElementById('featureName').value,
                description: document.getElementById('featureDescription').value,
                route: document.getElementById('featureRoute').value,
                status: document.getElementById('featureStatus').value
            };
        
            try {
                const response = await fetch(`/features/${isCreateMode ? 'create' : 'update/' + featureId}`, {
                    method: isCreateMode ? 'POST' : 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(featureData)
                });
        
                const data = await response.json();
        
                if (!response.ok) {
                    throw new Error(data.error || 'Erro na operação');
                }
        
                // Close modal first
                const modalContainer = document.querySelector('.modalContainer');
                const modal = document.getElementById('featureModal');
                modalContainer.hidden = true;
                modal.hidden = true;
        
                // Show success message
                showPopup(data.message);
        
                // Reload page after message is shown
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
        
            } catch (error) {
                showPopup(error.message || `Erro ao ${isCreateMode ? 'criar' : 'atualizar'} ferramenta`);
            } finally {
                hideLoading();
            }
        }
        
        async function handleEditFeature(featureId) {
            showLoading();
            try {
                const response = await fetch(`/features/list/${featureId}`);
                if (!response.ok) throw new Error('Erro ao buscar feature');
        
                const feature = await response.json();
                
                const form = document.getElementById('featureForm');
                form.dataset.mode = 'edit';
                form.dataset.featureId = featureId;
                document.getElementById('featureName').value = feature.name;
                document.getElementById('featureDescription').value = feature.description;
                document.getElementById('featureRoute').value = feature.route;
                document.getElementById('featureStatus').value = feature.status;
                
                document.querySelector('.modal-content h2').textContent = 'Editar Ferramenta';
                
                const modalContainer = document.querySelector('.modalContainer');
                const modal = document.getElementById('featureModal');
                modalContainer.hidden = false;
                modal.hidden = false;
            } catch (error) {
                showPopup('Erro ao carregar dados da ferramenta');
            } finally {
                hideLoading();
            }
        }

        async function handleDeleteFeature(featureId) {
            if (confirm('Tem certeza que deseja excluir esta ferramenta?')) {
                showLoading();
                try {
                    const response = await fetch(`/features/delete/${featureId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                
                    const data = await response.json();
                
                    if (response.ok && data.message) {
                        showPopup(data.message);
                        window.location.reload();
                    } else {
                        showPopup(data.error || 'Erro ao excluir ferramenta');
                    }
                } catch (error) {
                    console.error('Erro ao excluir ferramenta:', error);
                    showPopup('Erro ao excluir ferramenta');
                } finally {
                    hideLoading();
                }
            }
        }
                
        // Event listener para o campo de busca de alunos (para buscar)
        userSearchInput.addEventListener('input', function() {
            searchUser(this.value);
            highlightedIndex = -1; // Resetar o índice em nova busca
        });

        // Função de busca de usuários corrigida
        async function searchUser(searchTerm) {
            if (!searchTerm.trim()) {
                autocompleteResultsList.innerHTML = '';
                highlightedIndex = -1;
                return;
            }

            // Obter os valores corretos dos elementos
            const roleSelect = document.getElementById('userRole'); // Elemento correto para o cargo selecionado
            const districtSelect = document.getElementById('userDistrict');
            const schoolSelect = document.getElementById('userSchool');
            
            // Obter os valores, considerando os valores fixos quando aplicável
            let roleValue = roleSelect?.value || '';
            let districtValue = '';
            let schoolValue = '';
            
            // Use o papel do usuário logado para determinar quais valores usar
            if (loggedUserRole === 'Master') {
                // Master pode selecionar todos os valores
                districtValue = districtSelect?.value || '';
                schoolValue = schoolSelect?.value || '';
            } 
            else if (loggedUserRole === 'Inspetor') {
                // Inspetor usa distrito fixo e escola selecionada
                districtValue = window.userFixedDistrict || '';
                schoolValue = schoolSelect?.value || '';
            } 
            else {
                // Outros cargos usam valores fixos
                districtValue = window.userFixedDistrict || '';
                schoolValue = window.userFixedSchool || '';
            }
            
            // Construir URL com todos os parâmetros
            const params = new URLSearchParams();
            params.append('query', searchTerm);
            if (roleValue) params.append('role', roleValue);
            if (districtValue) params.append('districtId', districtValue);
            if (schoolValue) params.append('schoolId', schoolValue);
            
            const apiUrl = `/users/list?${params.toString()}`;
            
            console.log('Buscando usuários com:', {
                searchTerm,
                role: roleValue,
                districtId: districtValue,
                schoolId: schoolValue
            });

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status}`);
                }
                const data = await response.json();
                displayAutocompleteResults(data);
            } catch (error) {
                console.error('Erro ao buscar usuários:', error);
                autocompleteResultsList.innerHTML = '<li class="autocomplete-error">Erro ao buscar usuários</li>';
            }
        }

                // Modificar a função displayAutocompleteResults
        
        function displayAutocompleteResults(users) {
            autocompleteResultsList.innerHTML = '';
            highlightedIndex = -1;
        
            if (users && users.length > 0) {
                users.forEach((user, index) => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${user.name} (${user.role || 'Sem cargo'})`;
                    listItem.dataset.userId = user.id;
                    listItem.dataset.userName = user.name;
                    listItem.dataset.userRole = user.role || 'Sem turma';
                    // Adicionar classe para tornar visual que o item é clicável
                    listItem.classList.add('autocomplete-item');
                    listItem.addEventListener('click', addUserToSelection);
                    autocompleteResultsList.appendChild(listItem);
                });
            } else if (userSearchInput.value.trim()) {
                const listItem = document.createElement('li');
                listItem.textContent = 'Nenhum usuário encontrado';
                autocompleteResultsList.appendChild(listItem);
            }
        }

        async function addUserToSelection(event) {
            const userId = event.target.dataset.userId;
            const userName = event.target.dataset.userName;
            const userRole = event.target.dataset.userRole;

            if (!selectedUsers.includes(userId)) {
                selectedUsers.push(userId);
                const row = selectedUsersListBody.insertRow();
                row.dataset.userId = userId;

                // Name and role cells
                const nameCell = row.insertCell();
                const roleCell = row.insertCell();
                nameCell.textContent = userName;
                roleCell.textContent = userRole;

                // Features cell with dropdown
                const featureCell = row.insertCell();
                const featureSelect = document.createElement('select');
                featureSelect.classList.add('feature-select');

                // Add loading state
                featureSelect.innerHTML = '<option value="">Carregando...</option>';

                // Fetch features from database
                try {
                    const response = await fetch('/features/list');
                    if (!response.ok) throw new Error('Erro ao carregar ferramentas');
                    
                    const features = await response.json();
                    
                    // Populate select with features from database
                    featureSelect.innerHTML = `
                        <option value="">Selecionar ferramenta</option>
                        ${features.map(feature => `
                            <option value="${feature.id}">${feature.name}</option>
                        `).join('')}
                    `;
                } catch (error) {
                    console.error('Erro ao carregar lista de ferramentas:', error);
                    featureSelect.innerHTML = '<option value="">Erro ao carregar</option>';
                }

                // Continue with button creation
                const addFeatureBtn = document.createElement('button');
                addFeatureBtn.classList.add('btn-add-feature');
                addFeatureBtn.textContent = '';
                addFeatureBtn.onclick = () => assignFeature(userId, featureSelect.value);
                
                featureCell.appendChild(featureSelect);
                featureCell.appendChild(addFeatureBtn);

                // User features list
                const userFeaturesList = document.createElement('div');
                userFeaturesList.classList.add('user-features-list');
                userFeaturesList.dataset.userId = userId;
                featureCell.appendChild(userFeaturesList);

                // Load existing features
                loadUserFeatures(userId, userFeaturesList);

                // Actions cell
                const actionsCell = row.insertCell();
                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-user');
                removeButton.innerHTML = '&#x2715;';
                removeButton.dataset.userIdToRemove = userId;
                removeButton.addEventListener('click', removeUserFromSelection);
                actionsCell.appendChild(removeButton);

                // Clear search
                userSearchInput.value = '';
                autocompleteResultsList.innerHTML = '';
                selectedUsersTable.style.display = 'table';
            }
        }

        async function assignFeature(userId, featureId) {
            if (!featureId) return;
            
            try {
                const response = await fetch('/features/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, featureId })
                });

                if (!response.ok) throw new Error('Erro ao atribuir ferramenta');
                
                // Reload user features
                const container = document.querySelector(`.user-features-list[data-user-id="${userId}"]`);
                await loadUserFeatures(userId, container);
                
                showPopup('Ferramenta atribuída com sucesso');
            } catch (error) {
                showPopup('Erro ao atribuir ferramenta');
            }
        }

        function removeUserFromSelection(event) {
            const userIdToRemove = event.target.dataset.userIdToRemove;
            const indexToRemove = selectedUsers.indexOf(userIdToRemove);
            if (indexToRemove > -1) {
                selectedUsers.splice(indexToRemove, 1);
                const rowToRemove = event.target.closest('tr');
                selectedUsersListBody.removeChild(rowToRemove);

                if (selectedUsers.length === 0) {
                    selectedUsersTable.style.display = 'none';
                }
            }
        }

        // Event listener para o campo de busca de alunos (para navegação por teclado)
        userSearchInput.addEventListener('keydown', function(event) {
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

        // Função corrigida para inicializar campos baseados no papel do usuário
        function initializeRoleBasedFields() {
            // Obter o papel do usuário do elemento correto
            const loggedUserRole = document.getElementById('feature-form-user-role')?.value;
            if (!loggedUserRole) {
                console.error('Papel do usuário não encontrado');
                return;
            }
            
            console.log('Inicializando campos para papel:', loggedUserRole);
            
            // Referenciar elementos
            const districtContainer = document.getElementById('districtContainer');
            const schoolContainer = document.getElementById('schoolContainer');
            const districtSelect = document.getElementById('userDistrict');
            const schoolSelect = document.getElementById('userSchool');
            const districtHidden = document.getElementById('userDistrictHidden');
            const schoolHidden = document.getElementById('userSchoolHidden');
            
            // Verificar se os elementos foram encontrados
            if (!districtContainer || !schoolContainer) {
                console.error('Elementos de container não encontrados');
                return;
            }
            
            // Valores fixos do usuário logado (dos campos ocultos)
            const loggedUserDistrict = districtHidden?.value;
            const loggedUserSchool = schoolHidden?.value;
            
            // Armazenar valores para uso nas funções de busca
            window.userFixedDistrict = loggedUserDistrict;
            window.userFixedSchool = loggedUserSchool;
            window.userRole = loggedUserRole;
            
            console.log('Valores fixos -', 'Distrito:', loggedUserDistrict, 'Escola:', loggedUserSchool);
            
            // Aplicar visibilidade baseada no papel
            if (loggedUserRole === 'Master') {
                // Master vê ambos os campos
                districtContainer.style.display = 'none';
                schoolContainer.style.display = 'none';
                
                // Configurar carregamento de escolas quando mudar o distrito
                if (districtSelect) {
                    districtSelect.addEventListener('change', function() {
                        if (this.value) loadSchoolsByDistrict(this.value);
                    });
                    
                    // Carregar escolas para o distrito inicial
                    if (districtSelect.value) {
                        loadSchoolsByDistrict(districtSelect.value);
                    }
                }
            } 
            else if (loggedUserRole === 'Inspetor') {
                // Inspetor não vê distrito (usa o fixo) mas vê escola
                districtContainer.style.display = 'none';
                schoolContainer.style.display = 'block';
                
                // Carregar escolas do distrito fixo do inspetor
                if (loggedUserDistrict) {
                    console.log('Carregando escolas para distrito fixo:', loggedUserDistrict);
                    loadSchoolsByDistrict(loggedUserDistrict);
                }
            } 
            else {
                // Outros usuários não veem ambos os campos (usam os valores fixos)
                districtContainer.style.display = 'none';
                schoolContainer.style.display = 'none';
            }
        }

        // Função para carregar escolas baseado no distrito
        async function loadSchoolsByDistrict(districtId) {
            if (!districtId) return;
            
            const schoolSelect = document.getElementById('userSchool');
            if (!schoolSelect) return;
            
            try {
                // Mostrar loading
                schoolSelect.disabled = true;
                schoolSelect.innerHTML = '<option value="">Carregando escolas...</option>';
                
                // Usar a rota correta para buscar escolas
                const response = await fetch(`/schools/list?districtId=${districtId}`);
                if (!response.ok) throw new Error('Erro ao buscar escolas');
                
                const schools = await response.json();
                
                // Resetar select
                schoolSelect.innerHTML = '<option value="">Selecione uma escola</option>';
                
                // Adicionar escolas
                schools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.id;
                    option.textContent = school.name;
                    schoolSelect.appendChild(option);
                });
                
                schoolSelect.disabled = false;
                
            } catch (error) {
                console.error('Erro ao carregar escolas:', error);
                schoolSelect.innerHTML = '<option value="">Erro ao carregar escolas</option>';
                schoolSelect.disabled = false;
            }
        }

        function updateHighlight() {
            const listItems = autocompleteResultsList.querySelectorAll('li');
            listItems.forEach((item, index) => {
                if (index === highlightedIndex) {
                    item.classList.add('highlighted');
                } else {
                    item.classList.remove('highlighted');
                }
            });
        }

        async function loadUserFeatures(userId, container) {
            try {
                const response = await fetch(`/features/user/${userId}`);
                if (!response.ok) throw new Error('Erro ao carregar ferramentas');
                
                const features = await response.json();
                
                // Limpar o container
                container.innerHTML = '';
                
                // Adicionar cada feature como um elemento DOM com event listener adequado
                features.forEach(feature => {
                    const featureTag = document.createElement('div');
                    featureTag.className = 'feature-tag';
                    featureTag.textContent = feature.name;
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-feature';
                    removeBtn.innerHTML = '&#x2715;';
                    
                    // Adicionar event listener diretamente em vez de onclick inline
                    removeBtn.addEventListener('click', function() {
                        removeFeature(userId, feature.id);
                    });
                    
                    featureTag.appendChild(removeBtn);
                    container.appendChild(featureTag);
                });
                
                if (features.length === 0) {
                    container.innerHTML = '<span class="no-features">Nenhuma ferramenta atribuída</span>';
                }
            } catch (error) {
                console.error('Erro ao carregar ferramentas:', error);
                container.innerHTML = '<span class="error">Erro ao carregar ferramentas</span>';
            }
        }

        async function removeFeature(userId, featureId) {
            try {
                const response = await fetch(`/features/assign`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, featureId })
                });

                const data = await response.json();
                
                if (response.ok && data.message) {
                    // Reload user features
                    const container = document.querySelector(`.user-features-list[data-user-id="${userId}"]`);
                    await loadUserFeatures(userId, container);
                    
                    showPopup(data.message); // Use the message from the server
                } else {
                    throw new Error(data.error || 'Erro ao remover ferramenta');
                }
            } catch (error) {
                console.error('Erro na remoção:', error);
                showPopup(error.message || 'Erro ao remover ferramenta');
            }
        }
    } // fim do if(isFeatureSettings)
}); // fim do DOMContentLoaded