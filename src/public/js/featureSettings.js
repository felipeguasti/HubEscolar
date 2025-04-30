document.addEventListener('DOMContentLoaded', function() {
    const isFeatureSettings = window.location.pathname.includes("features/settings");
    if (isFeatureSettings) {
        const userSearchInput = document.getElementById('user-search');
        const autocompleteResultsList = document.querySelector('.feature-form-autocomplete-results');
        const selectedUsersListBody = document.getElementById('feature-form-selected-users-list');
        const selectedUsersTable = document.getElementById('feature-form-selected-users');
        const userRole = document.getElementById('userRole');
        const userDistrict = document.getElementById('userDistrict');
        let selectedUsers = [];
        let highlightedIndex = -1;

        handleAuthCheck();
        initializeFeatureHandlers();
    
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

        async function searchUser(searchTerm) {
            if (!searchTerm.trim()) {
                autocompleteResultsList.innerHTML = '';
                highlightedIndex = -1;
                return;
            }
 
            const apiUrl = `/users/list?query=${searchTerm}&role=${userRole.value}&districtId=${userDistrict.value}`;

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
                addFeatureBtn.textContent = '+';
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

        function handleDistrictVisibility(role) {
            const districtFormGroup = document.querySelector('#userDistrict').closest('.features-form-group');
            
            if (role === 'Master') {
                districtFormGroup.style.display = 'none';
                document.getElementById('userDistrict').value = ''; // Clear selection
            } else {
                districtFormGroup.style.display = 'block';
            }
        }
        
        document.getElementById('userRole').addEventListener('change', (e) => {
            handleDistrictVisibility(e.target.value);
        });
        
        handleDistrictVisibility(document.getElementById('userRole').value);
        
        function clearSearchInput() {
            userSearchInput.value = '';
            autocompleteResultsList.innerHTML = '';
            highlightedIndex = -1;
        }
        
        // Add event listeners for filter changes
        userRole.addEventListener('change', () => {
            clearSearchInput();
        });
        
        userDistrict.addEventListener('change', () => {
            clearSearchInput();
        });
    }
});

async function loadUserFeatures(userId, container) {
    try {
        const response = await fetch(`/features/user/${userId}`);
        if (!response.ok) throw new Error('Erro ao carregar ferramentas');
        
        const features = await response.json();
        container.innerHTML = features.map(feature => `
            <div class="feature-tag">
                ${feature.name}
                <button class="remove-feature" onclick="removeFeature('${userId}', '${feature.id}')">
                    &#x2715;
                </button>
            </div>
        `).join('');
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