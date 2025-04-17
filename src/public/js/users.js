document.addEventListener('DOMContentLoaded', function() {
    const isUsers = window.location.pathname.includes("users");
    if (isUsers) {
        handleAuthCheck();
        const showPopupButton = document.getElementById("inactiveUsersMessage");
        const popupShown = sessionStorage.getItem('popupShown');
        const userLoggedIn = sessionStorage.getItem('userLoggedIn');
        const userRole = document.getElementById("userRole").value;

        if (userLoggedIn && !popupShown && showPopupButton) {
            const message = showPopupButton.getAttribute("data-message");
            showPopup(message);

            sessionStorage.setItem('popupShown', 'true');
        }

        const addUsers = document.getElementById("addUsers");
        if (addUsers) {
            addUsers.addEventListener('click', function (event) {
                event.preventDefault(); 
                openRegisterModal();
            });
        }

        const resetPasswordButton = document.querySelector('.btn-confirm-reset');
        if (resetPasswordButton) {
            resetPasswordButton.addEventListener('click', function (event) {
                event.preventDefault(); 
                resetPassword();
            });
        }

        const closePopup = document.getElementById("close-popup");
        if (closePopup) {
            closePopup.addEventListener("click", () => {
                const popup = document.getElementById("generic-popup");
                popup.classList.add("hidden");
            });
        }

        function ListenerBtnEdit(){
            const btnEdit = document.querySelectorAll('.btn-edit');
            if(btnEdit){
                btnEdit.forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = button.getAttribute('data-user-id');
                        openEditModal(userId);
                    });
                });
            }
        }
        
        function ListenerBtnDelete(){
            const btnDelete = document.querySelectorAll('.btn-delete');
            if(btnDelete) {
                document.querySelectorAll('.btn-delete').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = button.getAttribute('data-user-id');
                        const name = button.getAttribute('data-name');
                        const email = button.getAttribute('data-email');
                        const role = button.getAttribute('data-role');
                        const status = button.getAttribute('data-status');
                        const createdAt = button.getAttribute('data-created-at');
                        openDeleteModal(userId, name, email, role, status, createdAt);
                    });
                });
            }
        }
        
        function listenerBtnReset(){
            const btnReset = document.querySelectorAll('.btn-reset-password');
            if (btnReset) {
                btnReset.forEach(button => {
                    button.addEventListener('click', function () {
                        const userId = button.getAttribute('data-user-id');
                        openResetPasswordModal(userId);
                    });
                });
            }
        }

        const btnClose = document.querySelectorAll('.close');
        if (btnClose) {
            btnClose.forEach(button => {
                button.addEventListener('click', closeModal);
            });
        }
        // Evento para buscar escolas ao selecionar um distrito
        if (userRole === "Master" || userRole === "Inspetor") {
            document.getElementById("districtFilter")?.addEventListener("change", async (event) => {
                const district = event.target.value;
                await loadSchools(district);
            });
        }

        // Evento para buscar turmas ao selecionar uma escola
        document.getElementById("schoolFilter")?.addEventListener("change", async (event) => {
            const district = document.getElementById("districtFilter")?.value;
            const school = event.target.value;
            await loadClasses(district, school);
        });

        const filterButton = document.getElementById("filterUsers");
        if (filterButton) {
            filterButton.addEventListener("click", async function (event) {
                event.preventDefault();
                try {
                    // Pegando os valores de todos os campos de filtro
                    const districtId = document.getElementById("districtFilter")?.value || "";
                    const schoolId = document.getElementById("schoolFilter")?.value || "";
                    const role = document.getElementById("roleFilter")?.value || "";
                    const content = document.getElementById("contentFilter")?.value || "";
                    const classValue = document.getElementById("classFilter")?.value || "";
                    const queryParams = new URLSearchParams();

                    // Adicionando apenas os campos com valores
                    if (districtId) queryParams.append("districtId", districtId);
                    if (schoolId) queryParams.append("schoolId", schoolId);
                    if (role) queryParams.append("role", role);
                    if (content) queryParams.append("content", content);
                    if (classValue) queryParams.append("class", classValue);

                    // Verifica se há algum filtro, se não, a URL é sem parâmetros
                    const url = queryParams.toString() ? `/users/filter?${queryParams.toString()}` : '/users/filter';

                    const response = await fetch(url);

                    if (!response.ok) throw new Error(`Erro ao buscar usuários filtrados - Status: ${response.status}`);

                    const data = await response.json();
                    atualizarTabelaUsuarios(data);
                } catch (error) {
                    console.error("❌ Erro ao filtrar usuários:", error);
                }
            });
        }
        
        function atualizarTabelaUsuarios(data) {
            const tbody = document.querySelector('table tbody');
            
            // Verifica se o tbody existe
            if (!tbody) {
                console.error("❌ Erro: Tabela não encontrada.");
                return; // Se o tbody não existir, não faz nada.
            }
        
            tbody.innerHTML = ''; // Limpa a tabela antes de preencher
        
            // Verifica se 'data.users' existe e é um array válido
            if (data && Array.isArray(data.users)) {
                const sortedUsers = data.users.sort((a, b) => {
                    if (a.status === 'inactive' && b.status !== 'inactive') return -1;
                    if (a.status !== 'inactive' && b.status === 'inactive') return 1;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
        
                sortedUsers.forEach(user => {
                    const tr = document.createElement('tr');
                    if (user.status === 'inactive') {
                        tr.classList.add('inactive-user');
                    }
        
                    tr.innerHTML = `
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td class="${user.status === 'inactive' ? 'inactive-text' : ''}">
                            ${user.status === 'inactive' ? 'Inativo' : 'Ativo'}
                        </td>
                        <td>${new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td>
                            <button class="btn btn-edit" data-user-id="${user.id}">Editar</button>
                            <button class="btn btn-delete" data-user-id="${user.id}" data-user-name="${user.name}" data-user-email="${user.email}" data-user-role="${user.role}" data-user-status="${user.status}" data-user-createdAt="${user.createdAt}">Excluir</button>
                            <button class="btn btn-reset-password" data-user-id="${user.id}">Reiniciar Senha</button>
                        </td>
                    `;
                    
                    tbody.appendChild(tr);
                });
            }
            ListenerBtnEdit();
            ListenerBtnDelete();
            listenerBtnReset();
        }
        //Busca escolas pelo distrito e preenche o select de escolas.
        async function loadSchools(district) {
                const schoolSelect = document.getElementById("schoolFilter");
            
                if (!district) {
                    schoolSelect.innerHTML = `<option value="">Selecione um distrito primeiro</option>`;
                    return;
                }
            
                try {
                    const response = await fetch(`/users/filter?districtId=${encodeURIComponent(district)}`);
                    const data = await response.json();
            
                    // Garantir que estamos pegando escolas do jeito certo
                    const uniqueSchools = [...new Map(data.schools.map(school => [school.id, school])).values()];
            
                    if (uniqueSchools.length > 0) {
                        schoolSelect.innerHTML = `<option value="">Selecione uma escola</option>` +
                            uniqueSchools.map(school => `<option value="${school.id}">${school.name}</option>`).join("");
                        
                        // Adicionar event listener para carregar as turmas quando a escola mudar
                        schoolSelect.addEventListener('change', async () => {
                            const schoolId = schoolSelect.value;
                            const gradeSelect = document.getElementById("classFilter");
            
                            if (!schoolId) {
                                gradeSelect.innerHTML = `<option value="">Selecione uma escola primeiro</option>`;
                                return;
                            }
            
                            try {
                                const grades = await fetchGradesBySchool(schoolId);
                                updateGradeSelect(grades); // Assumindo que você tem essa função para atualizar o select de turmas
                            } catch (error) {
                                console.error("Erro ao buscar turmas por escola:", error);
                            }
                        });
                    } else {
                        schoolSelect.innerHTML = `<option value="">Nenhuma escola encontrada</option>`;
                    }
                } catch (error) {
                    console.error("Erro ao buscar escolas:", error);
                }
            }
        

        //Busca turmas baseadas no distrito e escola selecionados e preenche o select de turmas.

        async function loadClasses(district, school) {
            const classSelect = document.getElementById("classFilter");

            if (!district || !school) {
                classSelect.innerHTML = `<option value="">Selecione um distrito e uma escola primeiro</option>`;
                return;
            }

            try {
                const response = await fetch(`/users/filter?districtId=${encodeURIComponent(district)}&schoolId=${encodeURIComponent(school)}`);
                const data = await response.json();

                const uniqueClasses = [...new Set(data.users.map(user => user.userClass))].filter(c => c);

                if (uniqueClasses.length > 0) {
                    classSelect.innerHTML = `<option value="">Selecione uma turma</option>` +
                        uniqueClasses.map(cls => `<option value="${cls}">${cls}</option>`).join("");
                } else {
                    classSelect.innerHTML = `<option value="">Nenhuma turma encontrada</option>`;
                }
            } catch (error) {
                console.error("Erro ao buscar turmas:", error);
            }
        }
        
        async function loadContentOptions() {
            const contentSelect = document.getElementById("contentFilter");

            try {
                const response = await fetch(`/users/filter`);
                const data = await response.json();

                const uniqueContents = [...new Set(data.users.map(user => user.subject))].filter(c => c);

                if (uniqueContents.length > 0) {
                    contentSelect.innerHTML = `<option value="">Selecione um conteúdo</option>` +
                        uniqueContents.map(content => `<option value="${content}">${content}</option>`).join("");
                } else {
                    contentSelect.innerHTML = `<option value="">Nenhum conteúdo encontrado no sistema</option>`;
                }
            } catch (error) {
                console.error("Erro ao buscar conteúdos:", error);
            }
        }
        // Função para adicionar listeners para limpar a tabela
        function addClearTableListeners() {
            const filters = [
                document.getElementById("districtFilter"),
                document.getElementById("schoolFilter"),
                document.getElementById("roleFilter"),
                document.getElementById("contentFilter"),
                document.getElementById("classFilter"),
                document.getElementById("statusFilter")
            ];
            
            filters.forEach(filter => {
                if (filter) {
                    filter.addEventListener("change", function () {
                        const userRole = document.getElementById("userRole").value; // Obtém o tipo de usuári
                        if (userRole === "Master") {
                            // Master: não preserva nada
                            atualizarTabelaUsuarios([]);
                        } else if (userRole === "Inspetor") {
                            // Inspetor: preserva district
                            if (filter.id !== "schoolFilter") {
                                atualizarTabelaUsuarios([]);
                            }
                        } else {
                            // Outros: preserva district e school
                            if (filter.id !== "districtFilter" && filter.id !== "schoolFilter") {
                                atualizarTabelaUsuarios([]);
                            }
                        }
                    });
                }
            });
        }
        
        // Função para adicionar o listener no campo "Cargo"
        function addRoleChangeListener() {
            const roleField = document.getElementById("roleFilter");
            const district = document.getElementById("districtFilter")?.value;
            if (roleField) {
                roleField.addEventListener("change", function () {
                    const role = roleField.value;
                    const contentField = document.getElementById("contentFilter");
                    const classField = document.getElementById("classFilter");
                    const districtField = document.getElementById("districtFilter");
                    const schoolField = document.getElementById("schoolFilter");

                    // Limpar e esconder campos quando o cargo for "Master"
                    if (role === "Master") {
                        // Esconder todos os campos e limpar seus valores
                        if (districtField) {
                            districtField.style.display = "none"; // Esconde
                        }
                        if (schoolField) {
                            schoolField.style.display = "none"; // Esconde
                        }
                        if (contentField) {
                            contentField.style.display = "none"; // Esconde
                        }
                        if (classField) {
                            classField.style.display = "none"; // Esconde
                        }
                    } else if (role === "Inspetor") {
                        // Esconder e limpar o campo "school" para o cargo "Inspetor"
                        if (schoolField) {
                            schoolField.style.display = "none"; // Esconde
                        }
                        // Apenas mostrar Distrito e Cargo para o Inspetor
                        if (districtField) {
                            districtField.style.display = "block";
                        }
                        if (roleField) roleField.style.display = "block";

                        // Esconder os campos de Conteúdo e Turma
                        if (contentField) contentField.style.display = "none";
                        if (classField) classField.style.display = "none";
                    } else if (role === "Diretor") {
                        // Apenas mostrar Distrito e Cargo para o Inspetor
                        if (districtField) {
                            districtField.style.display = "block";
                        }
                        if (roleField) roleField.style.display = "block";
                        if (schoolField) schoolField.style.display = "block";
                        if (contentField) contentField.style.display = "none";
                        if (classField) classField.style.display = "none";
                    } else {
                        if (role === "Professor") {
                            // Mostrar Conteúdo e esconder Turma
                            if (contentField) contentField.style.display = "block";
                            if (classField) classField.style.display = "none";
                        } else if (role === "Aluno") {
                            // Mostrar Turma e esconder Conteúdo
                            if (contentField) contentField.style.display = "none";
                            if (classField) classField.style.display = "block";
                        } else {
                            // Esconder ambos
                            if (contentField) contentField.style.display = "none";
                            if (classField) classField.style.display = "none";
                        }

                        // Mostrar os campos de distrito e escola (se necessário)
                        if (districtField) districtField.style.display = "block";
                        if (schoolField) schoolField.style.display = "block";
                    }
                });
            }
        }

        // Função para adicionar o listener no botão "Limpar"
        function addClearFilterListener() {
            const clearButton = document.getElementById("cleanFilter");
        
            if (clearButton) {
                clearButton.addEventListener("click", async function () {
                    // Limpa os valores dos campos de filtro
                    const districtFilter = document.getElementById("districtFilter");
                    const schoolFilter = document.getElementById("schoolFilter");
                    const roleFilter = document.getElementById("roleFilter");
                    const contentFilter = document.getElementById("contentFilter");
                    const classFilter = document.getElementById("classFilter");
                    const statusFilter = document.getElementById("statusFilter");
                    
                    // Verifica se os campos existem antes de alterar
                    //if (districtFilter) districtFilter.value = "";
                    //if (schoolFilter) schoolFilter.value = "";
                    if (roleFilter) roleFilter.value = "";
                    if (contentFilter) contentFilter.value = "";
                    if (classFilter) classFilter.value = "";
                    if (statusFilter) statusFilter.value = "";
        
                    // Desoculta todos os campos de filtro
                    const fields = [
                        "districtFilter",
                        "schoolFilter",
                        "roleFilter",
                        "contentFilter",
                        "classFilter",
                        "statusFilter"
                    ];
        
                    fields.forEach(fieldId => {
                        const field = document.getElementById(fieldId);
                        if (field) {
                            field.style.display = "block"; // Desoculta o campo
                        }
                    });
        
                    // Força a exibição dos campos 'Conteúdo' e 'Turma' se estiverem ocultos
                    const contentField = document.getElementById("contentFilter");
                    const classField = document.getElementById("classFilter");
        
                    if (contentField && contentField.style.display === "none") {
                        contentField.style.display = "block"; // Desoculta conteúdo
                    }
        
                    if (classField && classField.style.display === "none") {
                        classField.style.display = "block"; // Desoculta turma
                    }
        
                    // Faz uma requisição para obter todos os usuários sem filtros aplicados
                    try {
                        const url = "/users/filter"; // URL sem parâmetros de filtro
        
                        const response = await fetch(url);
                        
                        if (!response.ok) throw new Error(`Erro ao buscar todos os usuários - Status: ${response.status}`);
        
                        const data = await response.json();        
                        atualizarTabelaUsuarios(data); // Atualiza a tabela com todos os usuários
                    } catch (error) {
                        console.error("❌ Erro ao buscar todos os usuários:", error);
                    }
        
                    // Também pode ser interessante adicionar o foco no primeiro campo
                    if (districtFilter) districtFilter.focus();
                });
            }
        }
                        
        // Função para abrir o modal (modificada para esconder a tabela e garantir que apenas um modal esteja visível)
        function openModal(modalId, data) {
            const modals = document.querySelectorAll('.modal'); // Seleciona todos os modais
        
            // Fecha todos os modais antes de abrir um novo
            modals.forEach(modal => {
                modal.style.display = 'none'; // Esconde qualquer modal ativo
            });
        
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
                const container = document.querySelector('.modalContainer');
                container.hidden = false; // Torna o container visível
                modal.style.display = 'flex';
        
                // Ocultar a tabela
                document.querySelector('.admin-master-container').classList.add('modal-active');
                document.body.style.overflow = "hidden";
        
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.addEventListener('click', function (e) {
                        const modalContent = modal.querySelector('.modal-content');
                        const isClickInside = modalContent.contains(e.target);
                        
                        // Verifica se o clique não foi em um dos elementos interativos dentro do modal
                        // e se o clique não foi no botão cancelar
                        if (!isClickInside && !e.target.classList.contains('btn-cancel')) {
                            closeModal();
                        }
                    });
                });
            }
        }
        
        // Função para fechar qualquer modal (modificada para exibir a tabela novamente)
        function closeModal() {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => modal.style.display = 'none');
        
            // Ocultar o modalContainer
            const container = document.querySelector('.modalContainer');
            container.hidden = true; // Torna o container invisível
        
            // Mostrar a tabela quando o modal for fechado
            document.querySelector('.admin-master-container').classList.remove('modal-active');
            document.body.style.overflow = "auto";
        }
                
        // Função para abrir o modal de exclusão
        function openDeleteModal(userId) {
            // Exibir popup de loading enquanto busca os dados
            showLoading();
        
            // Requisição para buscar os dados do usuário
            fetch(`/users/list/${userId}`)
                .then(response => response.json())
                .then(data => {
                    // Preencher as informações no modal com os dados do usuário
                    document.getElementById('deleteName').textContent = data.name;
                    document.getElementById('deleteEmail').textContent = data.email;
                    document.getElementById('deleteRole').textContent = data.role;
                    document.getElementById('deleteStatus').textContent = data.status;
                    document.getElementById('deleteCreatedAt').textContent = new Date(data.createdAt).toLocaleDateString('pt-BR');
                    document.getElementById('deleteUserId').value = data.id;
                
                    // Abrir o modal
                    openModal('deleteModal');
                    hideLoading(); // Esconde o loading após a resposta
                })
                .catch(error => {
                    console.error('Erro ao buscar os dados do usuário:', error);
                    hideLoadingWithMessage('Erro ao carregar os dados do usuário');
                });
            // Adiciona o listener no botão "Salvar"
            const deleteButton = document.querySelector('.btn.btn-confirm');
            deleteButton.addEventListener('click', function (event) {
                event.preventDefault(); 
                confirmDelete(userId);
            });
            document.addEventListener('click', function (event) {
                if (event.target.matches('.btn.btn-cancel')) {
                    event.preventDefault();
                    closeModal();
                }
            });
        }

        // Função de confirmação para excluir um usuário
        function confirmDelete(userId) {
            // Exibir popup de loading
            showLoading();

            fetch(`/users/delete/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    hideLoadingWithMessage('Usuário excluído com sucesso!', () => {
                        location.reload();
                    });
                } else {
                    hideLoadingWithMessage('Erro ao excluir o usuário');
                }
            })
            .catch(error => {
                console.error('Erro na exclusão do usuário:', error);
                hideLoadingWithMessage('Erro ao excluir o usuário');
            });

        }

        async function openRegisterModal() {
            showLoading();
        
            // Preencher os campos do modal com valores vazios para cadastro
            document.getElementById('registerUserId').value = ''; // Id vazio pois é um novo cadastro
            document.getElementById('registerName').value = ''; // Nome
            document.getElementById('registerEmail').value = ''; // Email
            document.getElementById('registerCpf').value = ''; // CPF
            document.getElementById('registerPhone').value = ''; // Telefone
            document.getElementById('registerDateOfBirth').value = ''; // Data de Nascimento
            document.getElementById('registerGender').value = ''; // Gênero
            document.getElementById('registerRole').value = ''; // Função
            document.getElementById('registerHorario').value = ''; // Turno de Trabalho
            document.getElementById('registerStatus').value = ''; // Status
            document.getElementById('registerAddress').value = ''; // Endereço
            document.getElementById('registerCity').value = ''; // Cidade
            document.getElementById('registerState').value = ''; // Estado
            document.getElementById('registerZip').value = ''; // CEP
        
            // Selecionar os campos de Conteúdo e Classe
            const contentField = document.getElementById('registerContent')?.parentElement;
            const classField = document.getElementById('registerClass')?.parentElement;
            const schoolField = document.getElementById('registerSchool');

            const schoolSelect = document.getElementById('registerSchool');
            const gradeSelect = document.getElementById('registerClass');
            const schoolLabel = document.querySelector(`label[for="${schoolSelect.id}"]`);
            const districtField = document.getElementById('registerDistrict');
            const districtLabel = document.querySelector(`label[for="${districtField.id}"]`);
            const horarioField = document.getElementById('registerHorario');
            const horarioLabel = document.querySelector(`label[for="${horarioField.id}"]`);

            
            // Função para atualizar a visibilidade dos campos conforme o papel
            function updateFieldsVisibility(role) {
                if (role === 'Professor') {
                    contentField.style.display = 'block';
                    classField.style.display = 'none';
                    schoolField.style.display = 'block';
                    schoolLabel.style.display = 'block';
                    districtField.style.display = 'block';
                    districtLabel.style.display = 'block';
                    horarioField.style.display = 'block';
                    horarioLabel.style.display = 'clock';
                    document.getElementById('registerContent').value = '';
                } else if (role === 'Aluno') {
                    contentField.style.display = 'none';
                    classField.style.display = 'block';
                    schoolField.style.display = 'block';
                    schoolLabel.style.display = 'block';
                    districtField.style.display = 'block';
                    districtLabel.style.display = 'block';
                    horarioField.style.display = 'block';
                    horarioLabel.style.display = 'block';
                    classField.value = '';
                } else if (role === 'Master') {
                    contentField.style.display = 'none';
                    classField.style.display = 'none';
                    schoolField.style.display = 'none';
                    schoolLabel.style.display = 'none';
                    districtField.style.display = 'none';
                    districtLabel.style.display = 'none';
                    horarioField.style.display = 'none';
                    horarioLabel.style.display = 'none';
                    districtField.value = '';
                    schoolField.value = '';
                    contentField.value = '';
                } else if (role === 'Inspetor') {
                    contentField.style.display = 'none';
                    classField.style.display = 'none';
                    schoolField.style.display = 'none';
                    schoolLabel.style.display = 'none';
                    horarioField.style.display = 'none';
                    horarioLabel.style.display = 'none';
                    districtField.style.display = 'block';
                    districtLabel.style.display = 'block';
                    schoolField.value = '';
                    contentField.value = '';
                } else {
                    contentField.style.display = 'none';
                    classField.style.display = 'none';
                    schoolField.style.display = 'block';
                    schoolLabel.style.display = 'block';
                    districtField.style.display = 'block';
                    districtLabel.style.display = 'block';
                    horarioField.style.display = 'block';
                    horarioLabel.style.display = 'block';
                }
            }

            if (schoolSelect && gradeSelect) {
                if (schoolSelect.value) {
                    const grades = await fetchGradesBySchool(schoolSelect.value);
                    updateGradeSelect(grades);
                }
            }

            // Atualizar os campos conforme o papel do usuário
            updateFieldsVisibility(''); // Inicialmente vazio, sem papel
        
            // Adicionar listener para atualizar ao mudar o papel
            const roleSelect = document.getElementById('registerRole');
            if (roleSelect) {
                roleSelect.addEventListener('change', function () {
                    updateFieldsVisibility(this.value);
                });
            }
            const districtId = document.getElementById('registerDistrict').value;
            // Abrir o modal de cadastro
            openModal('registerModal');
            fetchSchoolsByDistrict(districtId);
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
                createUser();
            });
        }        

        function createUser() {
            // Obtendo os dados do formulário de cadastro
            const form = document.getElementById('registerForm');
            const formData = new FormData(form);
        
            // Criando um objeto com os dados do formulário
            const userData = {};
            formData.forEach((value, key) => {
                userData[key] = value;
            });
        
            // Tratamento da data de nascimento
            if (userData.dateOfBirth) {
                userData.dateOfBirth = new Date(userData.dateOfBirth).toISOString().split('T')[0];
            }
            
            console.log(formData);
            showLoading();
            // Requisição para criar um novo usuário
            fetch('/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            })
            .then(response => {
                if (!response.ok) {
                    // Se a resposta não for OK (status 2xx), lança um erro
                    throw new Error('Erro ao criar o usuário. Status: ' + response.status);
                }
                return response.json(); // Converte a resposta para JSON
            })
            .then(data => {
                // Verifica a resposta vinda do servidor
                if (data.message === 'Usuário criado com sucesso.') {
                    hideLoadingWithMessage(data.message, () => {
                        location.reload();
                    });
                } else {
                    hideLoadingWithMessage('Erro ao criar usuário: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro ao enviar os dados:', error);
                alert('Erro ao tentar criar o usuário. Tente novamente.');
            });
        }
                
        const districtSelect = document.getElementById('registerDistrict');
        const schoolSelect = document.getElementById('registerSchool');
    
        async function fetchSchoolsByDistrict(districtId) {
            try {
                schoolSelect.innerHTML = '<option>Carregando escolas...</option>'; // Exibe mensagem temporária
                const response = await fetch(`/schools/list?districtId=${districtId}`);
                if (!response.ok) throw new Error('Erro ao buscar escolas');
    
                const schools = await response.json();
                schoolSelect.innerHTML = ''; // Limpa as opções anteriores
    
                if (schools.length === 0) {
                    schoolSelect.innerHTML = '<option value="">Nenhuma escola encontrada</option>';
                    return;
                }
    
                schools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.id;
                    option.textContent = school.name;
                    schoolSelect.appendChild(option);
                });
            } catch (error) {
                console.error(error);
                schoolSelect.innerHTML = '<option value="">Erro ao carregar escolas</option>';
            }
        }
    
        districtSelect.addEventListener('blur', function() {
            const selectedDistrictId = districtSelect.value;
            if (selectedDistrictId) {
                fetchSchoolsByDistrict(selectedDistrictId);
            } else {
                schoolSelect.innerHTML = '<option value="">Selecione um distrito primeiro</option>';
            }
        });

        async function setupGradeRegisterSelectListener() {
            const schoolSelect = document.getElementById('registerSchool');
            const gradeSelect = document.getElementById('registerClass');
                    
            if (schoolSelect && gradeSelect) {
        
                // Configurar listener para mudanças na escola
                schoolSelect.addEventListener('change', async () => {
                    const schoolId = schoolSelect.value;
                    if (schoolId) {
                        const grades = await fetchGradesBySchool(schoolId);
                        updateGradeSelect(grades);
                    } else {
                        gradeSelect.innerHTML = '<option value="">Selecione uma escola</option>';
                    }
                });
            }
        }

        function openEditModal(userId) {
            showLoading();
            fetch(`/users/list/${userId}`)
                .then(response => response.json())
                .then(async (data) => {
                    document.getElementById('editUserId').value = data.id;
                    document.getElementById('editName').value = data.name;
                    document.getElementById('editEmail').value = data.email;
                    document.getElementById('editCpf').value = data.cpf || '';
                    document.getElementById('editPhone').value = data.phone || '';
                    document.getElementById('editDateOfBirth').value = new Date(data.dateOfBirth).toISOString().split('T')[0] || '';
                    document.getElementById('editGender').value = data.gender || '';
                    document.getElementById('editRole').value = data.role || '';
                    document.getElementById('editHorario').value = data.horario || '';
                    document.getElementById('editStatus').value = data.status || '';
                    document.getElementById('editAddress').value = data.address || '';
                    document.getElementById('editCity').value = data.city || '';
                    document.getElementById('editState').value = data.state || '';
                    document.getElementById('editZip').value = data.zip || '';
                    document.getElementById('editDistrict').value = data.districtId || '';

                    // Selecionar as opções corretas
                    document.getElementById('editSchool').value = data.schoolId || '';

                    const contentField = document.getElementById('editContent')?.parentElement;
                    const classField = document.getElementById('editClass')?.parentElement;
                    const schoolField = document.getElementById('editSchool');

                    const schoolSelect = document.getElementById('editSchool');
                    const schoolLabel = document.querySelector(`label[for="${schoolSelect.id}"]`);
                    const gradeSelect = document.getElementById('editClass');
                    const districtField = document.getElementById('editDistrict');
                    const districtLabel = document.querySelector(`label[for="${districtField.id}"]`);
                    const horarioField = document.getElementById('editHorario');
                    const horarioLabel = document.querySelector(`label[for="${horarioField.id}"]`);

                    console.log('data.schoolId:', data.schoolId);
                    console.log('editSchool.value:', document.getElementById('editSchool').value);

                    if (schoolSelect && gradeSelect) {
                        if (data.schoolId) {
                            const grades = await fetchGradesBySchool(data.schoolId);
                            updateGradeSelect(grades);
                        }
                    }

                    //Função para atualizar a visibilidade dos campos
                    function updateFieldsVisibility(role) {
                        if (role === 'Professor') {
                            contentField.style.display = 'block';
                            classField.style.display = 'none';
                            document.getElementById('editContent').value = data.content || '';
                        } else if (role === 'Aluno') {
                            contentField.style.display = 'none';
                            classField.style.display = 'block';
                            document.getElementById('editClass').value = data.userClass || '';
                        } else if (role === 'Master') {
                            contentField.style.display = 'none';
                            classField.style.display = 'none';
                            schoolField.style.display = 'none';
                            schoolLabel.style.display = 'none';
                            districtField.style.display = 'none';
                            districtLabel.style.display = 'none';
                            horarioField.style.display = 'none';
                            horarioLabel.style.display = 'none';
                        } else if (role === 'Inspetor') {
                            contentField.style.display = 'none';
                            classField.style.display = 'none';
                            schoolField.style.display = 'none';
                            schoolLabel.style.display = 'none';
                            horarioField.style.display = 'none';
                            horarioLabel.style.display = 'none';
                            districtField.style.display = 'block';
                            districtLabel.style.display = 'block'; 
                        } else {
                            contentField.style.display = 'none';
                            classField.style.display = 'none';
                            schoolField.style.display = 'block';
                            schoolLabel.style.display = 'block';
                            districtField.style.display = 'block';
                            districtLabel.style.display = 'block';
                            horarioField.style.display = 'block';
                            horarioLabel.style.display = 'block';
                        }
                    }
        
                    updateFieldsVisibility(data.role);
        
                    const roleSelect = document.getElementById('editRole');
                    if (roleSelect) {
                        roleSelect.addEventListener('change', function () {
                            updateFieldsVisibility(this.value);
                        });
                    }
        
                    // Passar schoolId na primeira chamada
                    const districtId = document.getElementById('editDistrict').value;
                    fetchSchoolsBySchool(districtId, data.schoolId);
       
                    openModal('editModal');
                    hideLoading();
                })
                .catch(error => {
                    console.error('Erro ao buscar os dados do usuário:', error);
                    hideLoadingWithMessage('Erro ao carregar os dados do usuário');
                });
       
            document.querySelectorAll('.btn-cancel').forEach(button => {
                button.addEventListener('click', function (e) {
                    e.stopPropagation();
                    closeModal();
                });
            });
        
            const saveButton = document.querySelector('.btn.btn-save-edit');
            saveButton.addEventListener('click', function (event) {
                event.preventDefault();
                console.log("Botão save apertado");
                editUser(userId);
            });
        }
        
        const editDistrictSelect = document.getElementById('editDistrict');
        const editSchoolSelect = document.getElementById('editSchool');

        async function fetchSchoolsBySchool(districtId, schoolId) {
            try {
                editSchoolSelect.innerHTML = '<option>Carregando escolas...</option>';
                const response = await fetch(`/schools/list?districtId=${districtId}`);
                if (!response.ok) throw new Error('Erro ao buscar escolas');

                const schools = await response.json();
                editSchoolSelect.innerHTML = '';

                if (schools.length === 0) {
                    editSchoolSelect.innerHTML = '<option value="">Nenhuma escola encontrada</option>';
                    return;
                }

                schools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.id;
                    option.textContent = school.name;

                    if (schoolId && school.id == schoolId) { // Adicionamos a verificação schoolId &&

                        option.selected = true;
                    }
                    editSchoolSelect.appendChild(option);
                });
            } catch (error) {
                console.error(error);
                editSchoolSelect.innerHTML = '<option value="">Erro ao carregar escolas</option>';
            }
        }

        editDistrictSelect.addEventListener('blur', function() {
            const selectedDistrictId = editDistrictSelect.value;
            if (selectedDistrictId) {
                fetchSchoolsBySchool(selectedDistrictId);
            } else {
                editSchoolSelect.innerHTML = '<option value="">Selecione um distrito primeiro</option>';
            }
        });

        async function setupGradeEditSelectListener() {
            const schoolSelect = document.getElementById('editSchool');
            const gradeSelect = document.getElementById('editClass');
        
            if (schoolSelect && gradeSelect) {
        
                // Configurar listener para mudanças na escola
                schoolSelect.addEventListener('change', async () => {
                    const schoolId = schoolSelect.value;
                    if (schoolId) {
                        const grades = await fetchGradesBySchool(schoolId);
                        updateGradeSelect(grades);
                    } else {
                        gradeSelect.innerHTML = '<option value="">Selecione uma turma</option>';
                    }
                });
            }
        }
        
        function updateGradeSelect(grades) {
            const editClass = document.getElementById('editClass');
            const registerClass = document.getElementById('registerClass');
            if(editClass){
                const gradeSelect = document.getElementById('editClass');
                gradeSelect.innerHTML = '<option value="">Selecione uma turma</option>';
                grades.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade.id;
                    option.textContent = grade.name;
                    gradeSelect.appendChild(option);
                });
            }
            if(registerClass){
                const gradeSelect = document.getElementById('registerClass');
                gradeSelect.innerHTML = '<option value="">Selecione uma turma</option>';
                grades.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade.id;
                    option.textContent = grade.name;
                    gradeSelect.appendChild(option);
                });
            }
        }

        async function fetchGradesBySchool(schoolId) {
            try {
                const response = await fetch(`/grades/list?schoolId=${schoolId}`);
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status}`);
                }
                const grades = await response.json();
                return grades;
            } catch (error) {
                console.error('Erro ao buscar turmas:', error);
                return []; // Retorna um array vazio em caso de erro
            }
        }

        // Função para editar um usuário
        function editUser(userId) {
            const name = document.getElementById('editName').value;
            const email = document.getElementById('editEmail').value;
            const cpf = document.getElementById('editCpf').value;  // CPF
            const phone = document.getElementById('editPhone').value;  // Telefone
            const dateOfBirth = document.getElementById('editDateOfBirth').value;  // Data de nascimento
            const gender = document.getElementById('editGender').value;  // Gênero
            const role = document.getElementById('editRole').value;  // Função
            const horario = document.getElementById('editHorario').value;  // Turno de trabalho
            const status = document.getElementById('editStatus').value;  // Status
            const address = document.getElementById('editAddress').value;  // Endereço
            const city = document.getElementById('editCity').value;  // Cidade
            const state = document.getElementById('editState').value;  // Estado
            const zip = document.getElementById('editZip').value;  // CEP
            const schoolId = document.getElementById('editSchool').value;  // CEP
            const districtId = document.getElementById('editDistrict').value;  // CEP
            const content = document.getElementById('editContent') ? document.getElementById('editContent').value : '';  // Conteúdo (se for professor)
            const userClass = document.getElementById('editClass') ? document.getElementById('editClass').value : '';  // Turma (se for aluno)
            // Exibir popup de loading
            showLoading();
        
            // Requisição AJAX para editar o usuário
            fetch(`/users/edit/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    cpf,
                    phone,
                    dateOfBirth,
                    gender,
                    role,
                    horario,
                    status,
                    address,
                    city,
                    state,
                    zip,
                    schoolId,
                    districtId,
                    content,  // Incluindo conteúdo se for professor
                    userClass: userClass  // Incluindo turma se for aluno
                })
            })
            .then(response => {
                if (response.ok) {
                    hideLoadingWithMessage('Usuário atualizado com sucesso!', () => {
                        location.reload();  // Recarregar a página após a atualização
                    });
                } else {
                    hideLoadingWithMessage('Erro ao atualizar o usuário');
                }
            })
            .catch(error => {
                console.error('Erro na atualização do usuário:', error);
                hideLoadingWithMessage('Erro ao atualizar o usuário');
            });
        }

        // Função para abrir o modal de reiniciar senha
        function openResetPasswordModal(userId) {
            document.getElementById('resetPasswordUserId').value = userId;
            openModal('resetPasswordModal');
        }

        function resetPassword() {
            const userId = document.getElementById('resetPasswordUserId').value;
        
            // Exibir popup de loading
            showLoading();
        
            // Enviar a requisição para resetar a senha
            fetch(`/users/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, resetByAdmin: true }) // Mantendo o corpo original
            })
            .then(response => response.json()) // Tratando a resposta como JSON
            .then(data => {
                if (data.message === 'Senha resetada com sucesso!') { // Condição atualizada para a mensagem correta
                    hideLoadingWithMessage(`Senha redefinida com sucesso! Nova senha: ${data.novaSenha}`, () => {
                        location.reload(); // Recarregar a página após a redefinição
                    });
                } else {
                    hideLoadingWithMessage(data.message || 'Erro ao reiniciar a senha'); // Exibe a mensagem de erro do backend
                }
            })
            .catch(error => {
                console.error('Erro ao reiniciar a senha:', error);
                hideLoadingWithMessage('Erro ao reiniciar a senha');
            });
        }
        loadContentOptions();
        addClearTableListeners();
        addRoleChangeListener();
        addClearFilterListener();
        ListenerBtnEdit();
        ListenerBtnDelete();
        listenerBtnReset();
        setupGradeEditSelectListener();
        setupGradeRegisterSelectListener();
    }
});