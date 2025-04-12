document.addEventListener('DOMContentLoaded', function() {
    const isDistrict = window.location.pathname.includes("district");
    if(isDistrict){
        const showPopupButton = document.getElementById("inactiveDistrictMessage");
        const popupShown = sessionStorage.getItem('popupShown');
        const userLoggedIn = sessionStorage.getItem('userLoggedIn');

        if (userLoggedIn && !popupShown && showPopupButton) {
            const message = showPopupButton.getAttribute("data-message");
            showPopup(message);

            sessionStorage.setItem('popupShown', 'true');
        }
        const addDistrict = document.getElementById("addDistrict");
        if (addDistrict) {
            addDistrict.addEventListener('click', function (event) {
                event.preventDefault(); 
                openRegisterModal();
            });
        }
        const closePopup = document.getElementById("close-popup");
        if (closePopup) {
            closePopup.addEventListener("click", () => {
                const popup = document.getElementById("generic-popup");
                popup.classList.add("hidden");
            });
        }
        const btnEdit = document.querySelectorAll('.btn-edit');
        if(btnEdit){
            btnEdit.forEach(button => {
                button.addEventListener('click', function() {
                    const districtId = button.getAttribute('data-district-id');
                    openEditModal(districtId);
                });
            });
        }
        const btnDelete = document.querySelectorAll('.btn-delete');
        if(btnDelete) {
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', function() {
                    const districtId = button.getAttribute('data-district-id');
                    const name = button.getAttribute('data-name');
                    const status = button.getAttribute('data-status');
                    const createdAt = button.getAttribute('data-created-at');
                    openDeleteModal(districtId, name, status, createdAt);
                });
            });
        }
        const btnClose = document.querySelectorAll('.close');
        if (btnClose) {
            btnClose.forEach(button => {
                button.addEventListener('click', closeModal);
            });
        }
        // Função para abrir o modal (modificada para esconder a tabela e garantir que apenas um modal esteja visível)
        function openModal(modalId, data) {
            const modals = document.querySelectorAll('.modal'); // Seleciona todos os modais
            const container = document.querySelector('.modalContainer');
        
            // Fecha todos os modais antes de abrir um novo
            modals.forEach(modal => {
                modal.style.display = 'none'; // Esconde qualquer modal ativo
            });
        
            // Exibe o container de modais, se estiver oculto
            if (container) {
                container.hidden = false; // Exibe o container
            }
        
            const modal = document.getElementById(modalId);
        
            // Verifica se o modal existe
            if (modal) {
                // Preencher os dados no modal, se fornecidos
                if (data) {
                    for (let key in data) {
                        const element = document.getElementById(key);
                        if (element) {
                            element.innerText = data[key];
                        }
                    }
                }
        
                // Exibe o modal
                modal.style.display = 'flex';
        
                // Ocultar a tabela e bloquear o scroll do corpo
                document.querySelector('.admin-master-container').classList.add('modal-active');
                document.body.style.overflow = "hidden";
                outClickListener();
            }
        }
        function outClickListener(){
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', function (e) {
                    const modalContent = modal.querySelector('.modal-content');
                    const isClickInside = modalContent.contains(e.target);                    
                    if (!isClickInside && !e.target.classList.contains('btn-cancel')) {
                        closeModal();
                    }
                });
            });
        }
        function closeModal() {
            console.log('Fechando o modal...');
            const modals = document.querySelectorAll('.modal');
            const container = document.querySelector('.modalContainer');
        
            // Esconde todos os modais
            modals.forEach(modal => modal.style.display = 'none');
        
            // Verifica se todos os modais estão fechados e, se sim, oculta o container
            const isAnyModalOpen = Array.from(modals).some(modal => modal.style.display === 'flex');
            if (!isAnyModalOpen && container) {
                container.hidden = true;  // Oculta o container de modais
            }
        
            // Mostrar a tabela novamente e desbloquear o scroll
            document.querySelector('.admin-master-container').classList.remove('modal-active');
            document.body.style.overflow = "auto";
        }           
        // Função para abrir o modal de exclusão
        function openDeleteModal(districtId) {
            // Exibir popup de loading enquanto busca os dados
            showLoading();
        
            // Requisição para buscar os dados do usuário
            fetch(`/districts/${districtId}`)
                .then(response => response.json())
                .then(data => {
                    // Preencher as informações no modal com os dados do usuário
                    document.getElementById('deletedistrictId').value = data.id;
                    document.getElementById('deleteName').textContent = data.name;
                    document.getElementById('deleteStatus').textContent = data.status;
                    document.getElementById('deleteCreatedAt').textContent = new Date(data.createdAt).toLocaleDateString('pt-BR');
                
                    // Abrir o modal
                    openModal('deleteModal');
                    hideLoading(); // Esconde o loading após a resposta
                })
                .catch(error => {
                    console.error('Erro ao buscar os dados do distrito:', error);
                    hideLoadingWithMessage('Erro ao carregar os dados do distrito');
                });
            // Adiciona o listener no botão "Salvar"
            const deleteButton = document.querySelector('.btn.btn-confirm');
            deleteButton.addEventListener('click', function (event) {
                event.preventDefault(); 
                confirmDelete(districtId);
            });
            document.addEventListener('click', function (event) {
                if (event.target.matches('.btn.btn-cancel')) {
                    event.preventDefault();
                    closeModal();
                }
            });
        }
        // Função de confirmação para excluir um usuário
        function confirmDelete(districtId) {
            // Exibir popup de loading
            showLoading();

            fetch(`/districts/delete/${districtId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    hideLoadingWithMessage('Distrito excluído com sucesso!', () => {
                        location.reload();
                    });
                } else {
                    hideLoadingWithMessage('Erro ao excluir o Distrito');
                }
            })
            .catch(error => {
                console.error('Erro na exclusão do Distrito:', error);
                hideLoadingWithMessage('Erro ao excluir o Distrito');
            });

        }
        function openRegisterModal() {
            console.log("Abrindo modal de cadastro...");
            showLoading();
        
            // Preencher os campos do modal com valores vazios para cadastro
            document.getElementById('registerName').value = ''; // Nome
            document.getElementById('registerStatus').value = ''; // Status
        
            // Abrir o modal de cadastro
            openModal('registerModal');
            hideLoading();
        
            document.addEventListener('click', function (event) {
                if (event.target.matches('.btn.btn-cancel')) {
                    event.preventDefault();
                    closeModal();
                }
            });
        
            // Adiciona o listener no botão "Salvar"
            const saveButton = document.querySelector('.btn.btn-save');
            saveButton.addEventListener('click', function (event) {
                event.preventDefault(); 
                createDistrict();
            });
        }        
        function createDistrict() {
            // Obtendo os dados diretamente do formulário
            const districtData = {
                name: document.getElementById('registerName').value,
                status: document.getElementById('registerStatus').value,
            };
        
            showLoading();
        
            fetch('/districts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(districtData),
            })
            .then(response => response.json())
            .then(data => {
                hideLoadingWithMessage(data.message || 'Distrito criado!', () => location.reload());
            })
            .catch(error => {
                console.error('Erro ao criar o distrito:', error);
                hideLoadingWithMessage('Erro ao criar o distrito.');
            });
        }                
        // Função para abrir o modal de edição
        function openEditModal(districtId) {
            showLoading();

            fetch(`/districts/${districtId}`)
                .then(response => response.json())
                .then(data => {
                    const nameInput = document.getElementById('editName');
                    const statusInput = document.getElementById('editStatus');

                    // Preencher os campos do modal com os dados do distrito
                    document.getElementById('editdistrictId').value = data.id;
                    nameInput.value = data.name;
                    statusInput.value = data.status || '';

                    // Armazenar os valores originais nos atributos data-original-*
                    nameInput.dataset.originalValue = data.name;
                    statusInput.dataset.originalValue = data.status;

                    // Habilita a adição de múltiplas escolas
                    updateSchoolList(districtId);
                    enableMultipleSchoolAddition();

                    // Abrir o modal de edição
                    openModal('editModal');
                    hideLoading();
                })
                .catch(error => {
                    console.error('Erro ao buscar os dados do distrito:', error);
                    hideLoadingWithMessage('Erro ao carregar os dados do distrito');
                });
            // Adiciona o listener para o botão "Salvar"
            const saveButton = document.querySelector('.btn.btn-save-edit');
            if(saveButton){
                saveButton.onclick = function (event) {
                    event.preventDefault();
                    editDistrict(districtId);
            }
            };
        }
        // Função para editar um distrito (apenas se os dados forem alterados)
        function editDistrict(districtId) {
            const nameInput = document.getElementById('editName');
            const statusInput = document.getElementById('editStatus');

            // Recupera os valores originais
            const originalName = nameInput.dataset.originalValue;
            const originalStatus = statusInput.dataset.originalValue;

            // Verifica se houve mudanças
            if (nameInput.value === originalName && statusInput.value === originalStatus) {
                hideLoadingWithMessage('Nenhuma alteração feita.');
                closeModal(); // Fecha o modal mesmo sem alterações
                return;
            }

            // Monta os dados para envio
            const districtData = {
                name: nameInput.value,
                status: statusInput.value,
            };

            showLoading();

            fetch(`/districts/edit/${districtId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(districtData),
            })
            .then(response => response.json())
            .then(data => {
                hideLoadingWithMessage(data.message || 'Distrito atualizado!', () => {
                    closeModal();
                    location.reload();
                });
            })
            .catch(error => {
                console.error('Erro ao atualizar o distrito:', error);
                hideLoadingWithMessage('Erro ao atualizar o distrito.');
            });
        }
        function setupAddSchoolButton() {
            const addButton = document.getElementById('addSchoolButton');
            
            // Verificar se o botão existe e se o listener já foi adicionado
            if (addButton && !addButton.hasListener) {
                addButton.addEventListener('click', function (event) {
                    event.preventDefault();
                    enableMultipleSchoolAddition();
                });
                
                // Marcar que o listener foi adicionado
                addButton.hasListener = true;
            }
        }
                
        function enableMultipleSchoolAddition() {
            const addButton = document.getElementById('addSchoolButton');
            const newSchoolInput = document.getElementById('newSchool');
            // Agora o envio da requisição ocorre quando o botão 'Adicionar' for clicado
            const schoolName = newSchoolInput.value.trim();
            
            // Verifica se o campo de nome da escola está vazio
            if (schoolName === '') {
                showPopup('Nome da escola é necessário');
                return;  // Não prossegue se o campo estiver vazio
            }
        
            // Lógica para adicionar a escola
            showLoading();
            const districtId = document.getElementById('editdistrictId').value;  // Usando o ID do distrito agora
            
            // Chama diretamente a função addSchool
            addSchool(districtId, schoolName)  // Passando o districtId ao invés do nome
                .then(response => {
                    hideLoading();
                    if (response.success) {
                        newSchoolInput.value = '';  // Limpa o campo após sucesso
                    } else {
                        // Verifica se a resposta tem um campo de erro e exibe a mensagem do servidor
                        if (response.error) {
                            showPopup(response.error);  // Exibe a mensagem de erro recebida do servidor
                        } else {
                            showPopup(response.message || 'Erro ao adicionar escola');
                        }
                    }
                })
                .catch(error => {
                    hideLoading();
                    console.error('Erro ao adicionar escola:', error);
                    showPopup('Erro ao adicionar escola');
                });
        }        
        
        function updateSchoolList(districtId) {
            fetch(`/schools/list?districtId=${districtId}`)
                .then(response => response.json())
                .then(data => {
                    const schoolContainer = document.querySelector('#associatedSchools');
                    schoolContainer.innerHTML = '';
                    const district = document.getElementById('editName').value;
                    // Criar título do distrito com o districtId (se necessário, você pode mapear o id para o nome posteriormente)
                    const districtTitle = document.createElement('h3');
                    districtTitle.textContent = district;  // Você pode alterar para um mapeamento do id para nome, se necessário
                    schoolContainer.appendChild(districtTitle);
        
                    // Criar subtítulo "Escolas Associadas:"
                    const schoolTitle = document.createElement('h4');
                    schoolTitle.textContent = 'Escolas Associadas:';
                    schoolContainer.appendChild(schoolTitle);
        
                    const ul = document.createElement('ul');
                    schoolContainer.appendChild(ul);
        
                    if (Array.isArray(data) && data.length > 0) {
                        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
                        data.forEach(school => {
                            const li = document.createElement('li');
        
                            // Criando os elementos na mesma ordem do EJS
                            const schoolNameSpan = document.createElement('span');
                            schoolNameSpan.className = 'school-name';
                            schoolNameSpan.dataset.id = school.id;
                            schoolNameSpan.textContent = school.name;
        
                            const editInput = document.createElement('input');
                            editInput.type = 'text';
                            editInput.className = 'edit-input';
                            editInput.dataset.id = school.id;
                            editInput.value = school.name;
                            editInput.style.display = 'none';
        
                            const editButton = document.createElement('button');
                            editButton.className = 'edit-icon';
                            editButton.dataset.id = school.id;
                            editButton.textContent = '✏️';
        
                            const deleteButton = document.createElement('button');
                            deleteButton.className = 'delete-icon';
                            deleteButton.dataset.id = school.id;
                            deleteButton.textContent = '🗑️';
        
                            // Adicionando os elementos na ordem correta
                            li.appendChild(schoolNameSpan);
                            li.appendChild(editInput);
                            li.appendChild(editButton);
                            li.appendChild(deleteButton);
                            ul.appendChild(li);
                        });
                    } else {
                        const noSchools = document.createElement('li');
                        noSchools.textContent = 'Nenhuma escola associada.';
                        ul.appendChild(noSchools);
                    }
        
                    // Reatribuir os event listeners para os botões
                    attachDeleteListeners();
                    attachEditListeners();
                })
                .catch(error => console.error('Erro ao atualizar a lista de escolas:', error));
        }
        
        function attachDeleteListeners() {
            document.querySelectorAll('.delete-icon').forEach(button => {
                button.removeEventListener('click', handleDeleteClick);
                button.addEventListener('click', handleDeleteClick);
            });
        }    
        function handleDeleteClick(event) {
            const schoolId = event.target.dataset.id;
            deleteSchool(schoolId, event);
        }      
        function attachEditListeners() {
            document.querySelectorAll('.edit-icon').forEach(button => {
                button.removeEventListener('click', handleEditClick);
                button.addEventListener('click', handleEditClick);
            });
        
            document.querySelectorAll('.confirm-edit').forEach(button => {
                button.removeEventListener('click', handleConfirmEdit);
                button.addEventListener('click', handleConfirmEdit);
            });
        
            document.querySelectorAll('.cancel-edit').forEach(button => {
                button.removeEventListener('click', handleCancelEdit);
                button.addEventListener('click', handleCancelEdit);
            });
        }        
        function handleEditClick(event) {
            const schoolId = event.target.dataset.id;
            editSchool(schoolId, event); // Apenas chama a função editSchool para gerenciar a edição
        }        
        function handleConfirmEdit(event) {
            const schoolId = event.target.dataset.id;
            const schoolItem = document.querySelector(`[data-id="${schoolId}"]`).parentElement;
        
            const schoolNameSpan = schoolItem.querySelector('.school-name');
            const editInput = schoolItem.querySelector('.edit-input');
            const editButton = schoolItem.querySelector('.edit-icon');
            const confirmButton = schoolItem.querySelector('.confirm-edit');
            const cancelButton = schoolItem.querySelector('.cancel-edit');
        
            const newSchoolName = editInput.value;
            const district = document.getElementById('editName').value;
        
            showLoading();
        
            fetch(`/schools/edit/${schoolId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSchoolName, district: district, status: 'active' }),
            })
                .then(response => response.json())
                .then(data => {
                    hideLoading();
        
                    if (data.success) {
                        schoolNameSpan.textContent = newSchoolName;
                    } else {
                        alert(data.message || 'Erro ao editar a escola');
                    }
        
                    // Restaurar a interface
                    schoolNameSpan.style.display = 'inline-block';
                    editInput.style.display = 'none';
                    confirmButton.style.display = 'none';
                    cancelButton.style.display = 'none';
                    editButton.style.display = 'inline-block';
                })
                .catch(error => {
                    hideLoading();
                    console.error('Erro ao editar a escola:', error);
                    alert('Erro ao editar a escola');
                });
        }
        function handleCancelEdit(event) {
            const schoolId = event.target.dataset.id;
            const schoolItem = document.querySelector(`[data-id="${schoolId}"]`).parentElement;
        
            const schoolNameSpan = schoolItem.querySelector('.school-name');
            const editInput = schoolItem.querySelector('.edit-input');
            const editButton = schoolItem.querySelector('.edit-icon');
            const confirmButton = schoolItem.querySelector('.confirm-edit');
            const cancelButton = schoolItem.querySelector('.cancel-edit');
        
            // Restaurar nome original e ocultar campos de edição
            editInput.value = schoolNameSpan.textContent;
            schoolNameSpan.style.display = 'inline-block';
            editInput.style.display = 'none';
            confirmButton.style.display = 'none';
            cancelButton.style.display = 'none';
            editButton.style.display = 'inline-block';
        }                         
        function resetSchoolFields() {
            const schoolContainer = document.getElementById('schoolContainer');
        
            // Remove todos os inputs extras de escolas
            schoolContainer.innerHTML = '';
        
            // Cria o label para o campo de entrada
            const schoolLabel = document.createElement('label');
            schoolLabel.setAttribute('for', 'newSchool');
            schoolLabel.textContent = 'Adicionar Escola:';
        
            // Cria um novo campo vazio para escola
            const newSchoolInput = document.createElement('input');
            const addSchoolButton = document.createElement('button');
        
            newSchoolInput.type = 'text';
            newSchoolInput.id = 'newSchool';
            newSchoolInput.name = 'newSchool';
            newSchoolInput.placeholder = 'Nome da Escola';
            newSchoolInput.classList.add('school-entry');
        
            addSchoolButton.id = 'addSchoolButton';
            addSchoolButton.textContent = 'Adicionar Escola';
            addSchoolButton.classList.add('add-school-btn');
        
            // Adiciona os elementos ao container
            schoolContainer.appendChild(schoolLabel);
            schoolContainer.appendChild(newSchoolInput);
            schoolContainer.appendChild(addSchoolButton);
        
            setupAddSchoolButton();
        }        
           
        function addSchool(districtId, schoolName) {
            const schoolData = {
                districtId: districtId,  // Agora passamos o ID do distrito
                name: schoolName,     
            };
        
            showLoading();
            return fetch('/schools/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(schoolData),
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                updateSchoolList(districtId);
                resetSchoolFields();
                
                // Não chamar closeModal aqui para evitar fechamento automático
                console.log('Escola adicionada com sucesso!');
                return data;
            })
            .catch(error => {
                hideLoading();
                console.error('Erro ao adicionar a escola:', error);
                throw error; // Lança o erro para ser capturado no .catch da função chamadora
            });
        }
          
        function editSchool(schoolId, event) {
            event.preventDefault();
        
            // Encontra o item da escola na lista
            const schoolItem = document.querySelector(`[data-id="${schoolId}"]`).parentElement;
        
            // Encontra o nome da escola na célula
            const schoolNameCell = schoolItem.querySelector('.school-name');
            const oldSchoolName = schoolNameCell.textContent;
        
            // Substitui o nome da escola por um campo de input
            const input = document.createElement('input');
            input.type = 'text';
            input.value = oldSchoolName;
            schoolNameCell.innerHTML = '';
            schoolNameCell.appendChild(input);
        
            // Foca automaticamente no campo de edição
            input.focus();
        
            // Captura o evento de pressionar Enter
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
        
                    const newSchoolName = input.value;
                    const districtId = document.getElementById('editdistrictId').value;
        
                    // Envia a requisição para o backend para editar a escola
                    const schoolData = {
                        name: newSchoolName,
                        districtId,
                        status: 'active'
                    };
        
                    showLoading();
        
                    fetch(`/schools/edit/${schoolId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(schoolData),
                    })
                    .then(response => response.json())
                    .then(data => {
                        hideLoading();
                                            
                        if (data.school) {
                            schoolNameCell.textContent = newSchoolName;
                            alert('Escola editada com sucesso!');
                    
                            updateSchoolList(districtId);
                        } else {
                            alert(data.message || 'Erro ao editar a escola');
                            schoolNameCell.textContent = oldSchoolName;
                        }
                    })
                    
                    .catch(error => {
                        hideLoading();
                        console.error('Erro ao editar a escola:', error);
                        alert('Erro ao editar a escola');
                        schoolNameCell.textContent = oldSchoolName;
                    });
                }
            });
        }
        const editIcon = document.querySelectorAll('.edit-icon');
        if (editIcon) {
            // Adiciona o evento de clique aos ícones de edição
            editIcon.forEach(button => {
                button.addEventListener('click', function(event) {
                    const schoolId = this.dataset.id;  // Obtém o ID da escola
                    editSchool(schoolId, event);  // Chama a função de edição
                });
            });
        }
        function deleteSchool(schoolId, event) {
            event.preventDefault();
            if (confirm('Tem certeza de que deseja excluir esta escola?')) {
                showLoading();
                const districtId = document.getElementById('editdistrictId').value;
                fetch(`/schools/delete/${schoolId}`, {
                    method: 'DELETE',
                })
                .then(response => response.json())
                .then(data => {
                    hideLoading();
            
                    if (data.success) {
                        const schoolItem = document.querySelector(`[data-id="${schoolId}"]`).parentElement;
                        schoolItem.remove();
                        alert('Escola excluída com sucesso!');
                    } else {
                        alert(data.message || 'Erro ao excluir a escola');
                    }
                    updateSchoolList(districtId);
                })
                .catch(error => {
                    hideLoading();
                    console.error('Erro ao excluir a escola:', error);
                    alert('Erro ao excluir a escola');
                });
            }
        }                              
        const deleteIcon = document.querySelectorAll('.delete-icon');
        if(deleteIcon){
            // Adiciona o evento de clique aos ícones de exclusão
            deleteIcon.forEach(button => {
                button.addEventListener('click', function(event) {
                    const schoolId = this.dataset.id;  // Obtém o ID da escola a partir do atributo data-id
                    deleteSchool(schoolId, event);  // Chama a função para excluir a escola
                });
            });
        } 
        setupAddSchoolButton();      
    }
});