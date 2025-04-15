document.addEventListener('DOMContentLoaded', function() {
    const isGrade = window.location.pathname.includes("grade");
    if(isGrade){
        handleAuthCheck();
        const showPopupButton = document.getElementById("inactiveGradesMessage");
        const popupShown = sessionStorage.getItem('popupShown');
        const userLoggedIn = sessionStorage.getItem('userLoggedIn');

        if (userLoggedIn && !popupShown && showPopupButton) {
            const message = showPopupButton.getAttribute("data-message");
            showPopup(message);

            sessionStorage.setItem('popupShown', 'true');
        }

        const addGrade = document.getElementById("addGrade");
        if (addGrade) {
            addGrade.addEventListener('click', function (event) {
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
                    const gradeId = button.getAttribute('data-grade-id');  // Alterado para gradeId
                    openEditModal(gradeId);
                });
            });
        }

        const btnDelete = document.querySelectorAll('.btn-delete');
        if(btnDelete) {
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', function() {
                    const gradeId = button.getAttribute('data-grade-id');  // Alterado para gradeId
                    const name = button.getAttribute('data-name');
                    const status = button.getAttribute('data-status');
                    const createdAt = button.getAttribute('data-created-at');
                    openDeleteModal(gradeId, name, status, createdAt);
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
        function openDeleteModal(gradeId) {
            // Exibir popup de loading enquanto busca os dados
            showLoading();
        
            // Requisição para buscar os dados da turma
            fetch(`/grades/${gradeId}`)
                .then(response => response.json())
                .then(data => {
                    // Preencher as informações no modal com os dados da turma
                    document.getElementById('deleteGradeId').value = data.id;
                    document.getElementById('deleteName').textContent = data.name;
                    document.getElementById('deleteStatus').textContent = data.status;
                    document.getElementById('deleteCreatedAt').textContent = new Date(data.createdAt).toLocaleDateString('pt-BR');
        
                    // Abrir o modal
                    openModal('deleteModal');
                    hideLoading(); // Esconde o loading após a resposta
                })
                .catch(error => {
                    console.error('Erro ao buscar os dados da turma:', error);
                    hideLoadingWithMessage('Erro ao carregar os dados da turma');
                });
        
            // Adiciona o listener no botão "Salvar"
            const deleteButton = document.querySelector('.btn.btn-confirm');
            deleteButton.addEventListener('click', function (event) {
                event.preventDefault(); 
                confirmDelete(gradeId);
            });
        
            document.addEventListener('click', function (event) {
                if (event.target.matches('.btn.btn-cancel')) {
                    event.preventDefault();
                    closeModal();
                }
            });
        }        
        // Função de confirmação para excluir uma turma
        function confirmDelete(gradeId) {
            // Exibir popup de loading
            showLoading();

            fetch(`/grades/delete/${gradeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    hideLoadingWithMessage('Turma excluída com sucesso!', () => {
                        location.reload();
                    });
                } else {
                    hideLoadingWithMessage('Erro ao excluir a Turma');
                }
            })
            .catch(error => {
                console.error('Erro na exclusão da Turma:', error);
                hideLoadingWithMessage('Erro ao excluir a Turma');
            });
        }

        function openRegisterModal() {
            console.log("Abrindo modal de cadastro de turma...");
            showLoading();

            // Preencher os campos do modal com valores vazios para cadastro de turma
            document.getElementById('registerName').value = '';       // Nome da turma
            //document.getElementById('registerYear').value = '';       // Ano letivo
            document.getElementById('registerShift').value = '';      // Turno
            document.getElementById('registerStartDate').value = '';  // Data de início
            document.getElementById('registerEndDate').value = '';    // Data de término
            document.getElementById('registerStatus').value = 'active'; // Status padrão
        
            // Abrir o modal de cadastro
            openModal('registerModal');
            hideLoading();
        
            // Adiciona um único listener ao botão "Cancelar"
            document.querySelector('.btn.btn-cancel').addEventListener('click', function (event) {
                event.preventDefault();
                closeModal();
            });
        
            // Remover event listeners duplicados do botão "Salvar"
            const saveButton = document.querySelector('.btn.btn-save');
            saveButton.removeEventListener('click', saveGradeHandler);
            saveButton.addEventListener('click', saveGradeHandler);
        }
        
        // Função separada para salvar a turma
        function saveGradeHandler(event) {
            event.preventDefault();
            createGrade(); // Função que envia os dados da nova turma para o backend
        }
        
        function createGrade() {
            // Obtendo os dados diretamente do formulário
            const gradeData = {
                name: document.getElementById('registerName').value,
                district: document.getElementById('registerDistrict').value,
                year: document.getElementById('registerYear').value,
                shift: document.getElementById('registerShift').value,
                startDate: document.getElementById('registerStartDate').value,
                endDate: document.getElementById('registerEndDate').value,
                status: document.getElementById('registerStatus').value,
                description: document.getElementById('registerDescription').value,
            };
        
            showLoading();
        
            fetch('/grades/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gradeData),
            })
            .then(response => response.json())
            .then(data => {
                hideLoadingWithMessage(data.message || 'Turma criada!', () => location.reload());
            })
            .catch(error => {
                console.error('Erro ao criar a turma:', error);
                hideLoadingWithMessage('Erro ao criar a turma.');
            });
        }
        // Função para abrir o modal de edição da turma
        function openEditModal(gradeId) {
            showLoading();

            fetch(`/grades/${gradeId}`)
                .then(response => response.json())
                .then(data => {
                    const nameInput = document.getElementById('editName');
                    const districtInput = document.getElementById('editDistrict');
                    const yearInput = document.getElementById('editYear');
                    const shiftInput = document.getElementById('editShift');
                    const startDateInput = document.getElementById('editStartDate');
                    const endDateInput = document.getElementById('editEndDate');
                    const statusInput = document.getElementById('editStatus');
                    const descriptionInput = document.getElementById('editDescription');

                    // Preencher os campos do modal com os dados da turma
                    nameInput.value = data.name;
                    districtInput.value = data.district;
                    yearInput.value = data.year;
                    shiftInput.value = data.shift;
                    startDateInput.value = data.startDate;
                    endDateInput.value = data.endDate || ''; // Garantir que não fique 'undefined'
                    statusInput.value = data.status;
                    descriptionInput.value = data.description || '';

                    // Armazenar os valores originais nos atributos data-original-* (caso precise de restauração)
                    nameInput.dataset.originalValue = data.name;
                    districtInput.dataset.originalValue = data.district;
                    yearInput.dataset.originalValue = data.year;
                    shiftInput.dataset.originalValue = data.shift;
                    startDateInput.dataset.originalValue = data.startDate;
                    endDateInput.dataset.originalValue = data.endDate || '';
                    statusInput.dataset.originalValue = data.status;
                    descriptionInput.dataset.originalValue = data.description || '';

                    // Abrir o modal de edição
                    openModal('editModal');
                    hideLoading();
                })
                .catch(error => {
                    console.error('Erro ao buscar os dados da turma:', error);
                    hideLoadingWithMessage('Erro ao carregar os dados da turma');
                });

            // Adiciona o listener para o botão "Salvar"
            const saveButton = document.querySelector('.btn.btn-save-edit');
            if (saveButton) {
                saveButton.onclick = function (event) {
                    event.preventDefault();
                    editGrade(gradeId);
                };
            }
        }
        // Função para editar uma turma (apenas se os dados forem alterados)
        function editGrade(gradeId) {
            const nameInput = document.getElementById('editName');
            const districtInput = document.getElementById('editDistrict');
            const yearInput = document.getElementById('editYear');
            const shiftInput = document.getElementById('editShift');
            const startDateInput = document.getElementById('editStartDate');
            const endDateInput = document.getElementById('editEndDate');
            const statusInput = document.getElementById('editStatus');
            const descriptionInput = document.getElementById('editDescription');

            // Recupera os valores originais
            const originalName = nameInput.dataset.originalValue;
            const originalDistrict = districtInput.dataset.originalValue;
            const originalYear = yearInput.dataset.originalValue;
            const originalShift = shiftInput.dataset.originalValue;
            const originalStartDate = startDateInput.dataset.originalValue;
            const originalEndDate = endDateInput.dataset.originalValue;
            const originalStatus = statusInput.dataset.originalValue;
            const originalDescription = descriptionInput.dataset.originalValue;

            // Verifica se houve mudanças
            if (
                nameInput.value === originalName &&
                districtInput.value === originalDistrict &&
                yearInput.value === originalYear &&
                shiftInput.value === originalShift &&
                startDateInput.value === originalStartDate &&
                endDateInput.value === originalEndDate &&
                statusInput.value === originalStatus &&
                descriptionInput.value === originalDescription
            ) {
                hideLoadingWithMessage('Nenhuma alteração feita.');
                closeModal(); // Fecha o modal mesmo sem alterações
                return;
            }

            // Monta os dados para envio
            const gradeData = {
                name: nameInput.value,
                district: districtInput.value,
                year: yearInput.value,
                shift: shiftInput.value,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                status: statusInput.value,
                description: descriptionInput.value,
            };

            showLoading();

            fetch(`/grades/edit/${gradeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gradeData),
            })
            .then(response => response.json())
            .then(data => {
                hideLoadingWithMessage(data.message || 'Turma atualizada!', () => {
                    closeModal();
                    location.reload();
                });
            })
            .catch(error => {
                console.error('Erro ao atualizar a turma:', error);
                hideLoadingWithMessage('Erro ao atualizar a turma.');
            });
        }

        function setupAddGradeButton() {
            const addButton = document.getElementById('addGradeButton');
        
            // Verificar se o botão existe e se o listener já foi adicionado
            if (addButton && !addButton.dataset.listenerAdded) {
                addButton.addEventListener('click', function (event) {
                    event.preventDefault();
                    enableMultipleGradeAddition(); // Função equivalente para adicionar múltiplas turmas
                });
        
                // Marcar que o listener foi adicionado
                addButton.dataset.listenerAdded = "true";
            }
        }        
                
        function enableMultipleGradeAddition() {
            const addButton = document.getElementById('addGradeButton');
            const newGradeInput = document.getElementById('newGrade');
            
            // Verifica se o campo de nome da turma está vazio
            const gradeName = newGradeInput.value.trim();
            if (gradeName === '') {
                showPopup('Nome da turma é necessário');
                return;  // Não prossegue se o campo estiver vazio
            }
        
            // Lógica para adicionar a turma
            showLoading();
            const district = document.getElementById('editDistrict').value; // Ajustado para pegar o distrito
        
            // Chama diretamente a função addGrade
            addGrade(district, gradeName)
                .then(response => {
                    hideLoading();
                    if (response.success) {
                        newGradeInput.value = '';  // Limpa o campo após sucesso
                    } else {
                        // Verifica se a resposta tem um campo de erro e exibe a mensagem do servidor
                        if (response.error) {
                            showPopup(response.error);  // Exibe a mensagem de erro recebida do servidor
                        } else {
                            showPopup(response.message || 'Erro ao adicionar turma');
                        }
                    }
                })
                .catch(error => {
                    hideLoading();
                    console.error('Erro ao adicionar turma:', error);
                    showPopup('Erro ao adicionar turma');
                });
        }
                
        function updateGradeList(districtName) {
            fetch(`/grades/list?district=${districtName}`)
                .then(response => response.json())
                .then(data => {
                    const gradeContainer = document.querySelector('#associatedGrades');
                    gradeContainer.innerHTML = '';
            
                    // Criar título do distrito
                    const districtTitle = document.createElement('h3');
                    districtTitle.textContent = districtName;
                    gradeContainer.appendChild(districtTitle);
            
                    // Criar subtítulo "Turmas Associadas:"
                    const gradeTitle = document.createElement('h4');
                    gradeTitle.textContent = 'Turmas Associadas:';
                    gradeContainer.appendChild(gradeTitle);
            
                    const ul = document.createElement('ul');
                    gradeContainer.appendChild(ul);
            
                    if (Array.isArray(data) && data.length > 0) {
                        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
                        data.forEach(grade => {
                            const li = document.createElement('li');
            
                            // Criando os elementos na mesma ordem do EJS
                            const gradeNameSpan = document.createElement('span');
                            gradeNameSpan.className = 'grade-name';
                            gradeNameSpan.dataset.id = grade.id;
                            gradeNameSpan.textContent = grade.name;
            
                            const editInput = document.createElement('input');
                            editInput.type = 'text';
                            editInput.className = 'edit-input';
                            editInput.dataset.id = grade.id;
                            editInput.value = grade.name;
                            editInput.style.display = 'none';
            
                            const editButton = document.createElement('button');
                            editButton.className = 'edit-icon';
                            editButton.dataset.id = grade.id;
                            editButton.textContent = '✏️';
            
                            const deleteButton = document.createElement('button');
                            deleteButton.className = 'delete-icon';
                            deleteButton.dataset.id = grade.id;
                            deleteButton.textContent = '🗑️';
            
                            // Adicionando os elementos na ordem correta
                            li.appendChild(gradeNameSpan);
                            li.appendChild(editInput);
                            li.appendChild(editButton);
                            li.appendChild(deleteButton);
                            ul.appendChild(li);
                        });
                    } else {
                        const noGrades = document.createElement('li');
                        noGrades.textContent = 'Nenhuma turma associada.';
                        ul.appendChild(noGrades);
                    }
            
                    // Reatribuir os event listeners para os botões
                    attachDeleteListeners();
                    attachEditListeners();
                })
                .catch(error => console.error('Erro ao atualizar a lista de turmas:', error));
        }
        
        function attachDeleteListeners() {
            document.querySelectorAll('.delete-icon').forEach(button => {
                button.removeEventListener('click', handleDeleteClick);
                button.addEventListener('click', handleDeleteClick);
            });
        }    
        function handleDeleteClick(event) {
            const gradeId = event.target.dataset.id;
            deleteGrade(gradeId, event);
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
            const gradeId = event.target.dataset.id;
            editGrade(gradeId, event); // Apenas chama a função editGrade para gerenciar a edição
        }        
        function handleConfirmEdit(event) {
            const gradeId = event.target.dataset.id;
            const gradeItem = document.querySelector(`[data-id="${gradeId}"]`).parentElement;
        
            const gradeNameSpan = gradeItem.querySelector('.grade-name');
            const editInput = gradeItem.querySelector('.edit-input');
            const editButton = gradeItem.querySelector('.edit-icon');
            const confirmButton = gradeItem.querySelector('.confirm-edit');
            const cancelButton = gradeItem.querySelector('.cancel-edit');
        
            const newGradeName = editInput.value;
            const district = document.getElementById('editName').value;
        
            showLoading();
        
            fetch(`/grades/edit/${gradeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGradeName, district: district, status: 'active' }),
            })
                .then(response => response.json())
                .then(data => {
                    hideLoading();
        
                    if (data.success) {
                        gradeNameSpan.textContent = newGradeName;
                    } else {
                        alert(data.message || 'Erro ao editar a turma');
                    }
        
                    // Restaurar a interface
                    gradeNameSpan.style.display = 'inline-block';
                    editInput.style.display = 'none';
                    confirmButton.style.display = 'none';
                    cancelButton.style.display = 'none';
                    editButton.style.display = 'inline-block';
                })
                .catch(error => {
                    hideLoading();
                    console.error('Erro ao editar a turma:', error);
                    alert('Erro ao editar a turma');
                });
        }
        
        function handleCancelEdit(event) {
            const gradeId = event.target.dataset.id;
            const gradeItem = document.querySelector(`[data-id="${gradeId}"]`).parentElement;
        
            const gradeNameSpan = gradeItem.querySelector('.grade-name');
            const editInput = gradeItem.querySelector('.edit-input');
            const editButton = gradeItem.querySelector('.edit-icon');
            const confirmButton = gradeItem.querySelector('.confirm-edit');
            const cancelButton = gradeItem.querySelector('.cancel-edit');
        
            // Restaurar nome original e ocultar campos de edição
            editInput.value = gradeNameSpan.textContent;
            gradeNameSpan.style.display = 'inline-block';
            editInput.style.display = 'none';
            confirmButton.style.display = 'none';
            cancelButton.style.display = 'none';
            editButton.style.display = 'inline-block';
        }
        
        function resetGradeFields() {
            console.log('resetGradeFields foi chamada');
            const gradeContainer = document.getElementById('gradeContainer');
        
            // Remove todos os inputs extras de turmas
            gradeContainer.innerHTML = '';
        
            // Cria o label para o campo de entrada
            const gradeLabel = document.createElement('label');
            gradeLabel.setAttribute('for', 'newGrade');
            gradeLabel.textContent = 'Adicionar Turma:';
        
            // Cria um novo campo vazio para turma
            const newGradeInput = document.createElement('input');
            const addGradeButton = document.createElement('button');
        
            newGradeInput.type = 'text';
            newGradeInput.id = 'newGrade';
            newGradeInput.name = 'newGrade';
            newGradeInput.placeholder = 'Nome da Turma';
            newGradeInput.classList.add('grade-entry');
        
            addGradeButton.id = 'addGradeButton';
            addGradeButton.textContent = 'Adicionar Turma';
            addGradeButton.classList.add('add-grade-btn');
        
            // Adiciona os elementos ao container
            gradeContainer.appendChild(gradeLabel);
            gradeContainer.appendChild(newGradeInput);
            gradeContainer.appendChild(addGradeButton);
        
            // Configurar evento para adicionar novas turmas
            setupAddGradeButton();
        }
                           
        function addSchool(district, schoolName) {
            const schoolData = {
                district: district,
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
                updateSchoolList(district);
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
                    const district = document.getElementById('editName').value;
        
                    // Envia a requisição para o backend para editar a escola
                    const schoolData = {
                        name: newSchoolName,
                        district: district,
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
                    
                            updateSchoolList(district);
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
                const districtName = document.getElementById('editName').value;
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
                    updateSchoolList(districtName);
                })
                .catch(error => {
                    hideLoading();
                    console.error('Erro ao excluir a escola:', error);
                    alert('Erro ao excluir a escola');
                });
            }
        }                              
        const deleteGradeIcons = document.querySelectorAll('.delete-grade-icon');

        if (deleteGradeIcons) {
            // Adiciona o evento de clique aos ícones de exclusão
            deleteGradeIcons.forEach(button => {
                button.addEventListener('click', function(event) {
                    const gradeId = this.dataset.id;  // Obtém o ID da turma a partir do atributo data-id
                    deleteGrade(gradeId, event);  // Chama a função para excluir a turma
                });
            });
        }
        setupAddGradeButton();
    }
});