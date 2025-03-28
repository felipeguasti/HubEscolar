document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById('multi-step-form');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const pages = document.querySelectorAll('.form-page');
    const messageEl = document.getElementById('message');
    const roleSelect = document.getElementById('role');
    const turmaField = document.getElementById('turma-group');
    const conteudoField = document.getElementById('content-group');
    let currentPage = 0;
    const togglePasswordButton = document.getElementById("toggle-password");
    const passwordField = document.getElementById("password");
    const isLoginPage = window.location.pathname.includes("login");
    const isCadastroPage = window.location.pathname.includes("cadastro");
    const isDashboard = window.location.pathname.includes("dashboard");
    const isUsers = window.location.pathname.includes("users");
    const isDistrict = window.location.pathname.includes("district");
    const isGrade = window.location.pathname.includes("grade");
    const token = localStorage.getItem('token');
    const protectedPages = ['/dashboard', '/profile'];
    const currentPath = window.location.pathname;
    const logoutButton = document.getElementById('logout-btn');
    const userRole = sessionStorage.getItem("user.role");

    updateLoginButton();
    checkTokenAndShowLogout();

    const redirectToLogin = () => {
        window.location.href = '/login';
    };
    
    if (protectedPages.includes(currentPath)) {
        if (!token) {
            console.error("Token não encontrado, redirecionando para login...");
            redirectToLogin();
        }
    }
        
    if (togglePasswordButton && passwordField) {
        togglePasswordButton.addEventListener("click", function() {
            const type = passwordField.type === "password" ? "text" : "password";
            passwordField.type = type;

            togglePasswordButton.textContent = type === "password" ? "👁️" : "🙈";
        });
    }
    const passwordResetForm = document.querySelector('.form-reset');
    if (passwordResetForm) {
        passwordResetForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(passwordResetForm);
            const email = formData.get('email');

            if (!email.trim()) {
                showPopup('Por favor, insira um e-mail válido.');
                return;
            }
            showLoading();
            try {
                const response = await fetch(passwordResetForm.action, {
                    method: passwordResetForm.method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();

                if (response.ok) {
                    hideLoadingWithMessage(data.message, () => {
                        location.reload();
                    });
                } else {
                    hideLoadingWithMessage(data.message || 'Erro ao processar a solicitação.');
                }
            } catch (error) {
                console.error('Erro ao enviar solicitação:', error);
                hideLoadingWithMessage('Erro ao processar a solicitação. Tente novamente.');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    if (isLoginPage) {
        // Se o token ainda for válido, redireciona diretamente para o dashboard
        if (isTokenValid()) {
            window.location.href = '/dashboard';
            return;
        }
        checkTokenAndShowLogout();
        updateLoginButton();
    
        const loginForm = document.getElementById("login-form");
        const submitBtn = document.getElementById("submit-btn");
        const messageEl = document.getElementById("message");
    
        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);
    
            async function handleLogin(event) {
                event.preventDefault();
    
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value.trim();
    
                if (!email || !password) {
                    messageEl.textContent = "Por favor, preencha todos os campos.";
                    return;
                }
    
                submitBtn.disabled = true;
    
                try {
                    const response = await fetch('/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });
    
                    const data = await response.json();
                    console.log('Login bem-sucedido. Dados recebidos:', data);
    
                    if (response.ok && data.token) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('tokenExpiration', data.expiresAt); // Armazena o tempo de expiração
                        console.log('Token e tempo de expiração armazenados:', data.token, data.expiresAt, data.redirectTo);
                        // Verifica se há uma URL de redirecionamento
                        if (data.redirectTo) {
                            sessionStorage.setItem('userLoggedIn', 'true');
                            window.location.href = data.redirectTo;  // Redireciona para o dashboard ou outra URL fornecida
                        }
                    } else {
                        console.error('Erro no login:', data.message);
                        showPopup(data.message || 'Erro ao processar o login. Tente novamente.');
                    }
                } catch (error) {
                    console.error('Erro ao enviar login:', error);
                    showPopup('Erro ao processar a solicitação. Tente novamente.');
                } finally {
                    submitBtn.disabled = false;
                }
            }
        }
    }        

    if (isCadastroPage) {
        // Atualiza os campos visíveis com base no papel (professor ou aluno) e turno
        window.updateFields = function() {
            if (!roleSelect) return;
        
            const role = roleSelect.value;
            const turno = document.getElementById("horario").value;
            turmaField.style.display = (role === 'aluno') ? 'block' : 'none'; 
            conteudoField.style.display = (role === 'professor') ? 'block' : 'none';
            if (role === 'aluno' && turno) {
                buscarTurmas(turno);
            }
        };
        
        window.buscarTurnos = async function() {
            const turnoSelect = document.getElementById("horario");
        
            try {
                const response = await fetch('/classes/turnos');
                if (!response.ok) {
                    throw new Error('Erro ao buscar turnos');
                }
        
                const turnos = await response.json();
                turnoSelect.innerHTML = '<option value="">Selecione...</option>';
        
                // Preenche o select com os turnos retornados
                turnos.forEach(turno => {
                    const option = document.createElement("option");
                    option.value = turno;
                    option.textContent = turno;
                    turnoSelect.appendChild(option);
                });
        
            } catch (error) {
                console.error("Erro ao buscar turnos:", error);
                turnoSelect.innerHTML = '<option value="">Erro ao carregar turnos</option>';
            }
        };   

        window.buscarTurmas = async function() {
            const horario = document.getElementById("horario").value;
            const turmaSelect = document.getElementById("class");
        
            if (!horario) {
                turmaSelect.innerHTML = '<option value="">Selecione um turno primeiro</option>';
                return;
            }
        
            try {
                const response = await fetch(`/classes/${horario}`);
                if (!response.ok) {
                    throw new Error('Erro ao buscar turmas');
                }
        
                const turmas = await response.json();
                turmaSelect.innerHTML = '<option value="">Selecione...</option>';
        
                turmas.forEach(turma => {
                    const option = document.createElement("option");
                    option.value = turma.id;
                    option.textContent = turma.name;
                    turmaSelect.appendChild(option);
                });
        
            } catch (error) {
                console.error("Erro ao buscar turmas:", error);
                turmaSelect.innerHTML = '<option value="">Erro ao carregar turmas</option>';
            }
        };    
        
        if (roleSelect) {
            roleSelect.addEventListener("change", updateFields);
        }
        function validatePage() {
            const activePage = pages[currentPage];
        
            if (!activePage) {
                console.error("Erro: Nenhuma página ativa encontrada!");
                return false;
            }
        
            const inputs = activePage.querySelectorAll("input, select");
        
            for (let input of inputs) {
                // Verifica se o campo está visível antes de validar
                if (input.offsetParent !== null && !input.value.trim()) {
                    alert(`Por favor, preencha o campo: ${input.previousElementSibling?.innerText || input.name}`);
                    return false;
                }
            }
        
            // Verificação de senhas
            if (activePage.querySelector("#password") && activePage.querySelector("#confirm-password")) {
                const passwordField = document.getElementById("password");
                const confirmPasswordField = document.getElementById("confirm-password");
        
                if (passwordField && confirmPasswordField) {
                    const password = passwordField.value;
                    const confirmPassword = confirmPasswordField.value;
        
                    if (password !== confirmPassword) {
                        alert("As senhas não coincidem. Por favor, verifique.");
                        return false;
                    }
                }
            }
        
            return true;
        }
        if (roleSelect) {
        Array.from(roleSelect.options).forEach(option => {
            if (option.value === 'Master') {
                option.remove();
            }
        });
        }

        function updateForm() {
            pages.forEach((page, index) => {
                page.classList.toggle('hidden', index !== currentPage);
            });
            
            if (prevBtn) prevBtn.classList.toggle('hidden', currentPage === 0);
            if (nextBtn) nextBtn.classList.toggle('hidden', currentPage === pages.length - 1);
            if (submitBtn) submitBtn.classList.toggle('hidden', currentPage !== pages.length - 1);
        
            // Chamar buscarTurnos() quando a segunda página for exibida
            if (currentPage === 1) {  
                buscarTurnos();
            }
        }
        async function checkNameAndEmailExistence() {
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;    
            try {
                const response = await fetch('/auth/check-name-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email }),
                });
        
                if (response.ok) {
                    const data = await response.json();
                    if (data.available) {
                        return true;
                    }
                }    
                const data = await response.json();
                messageEl.textContent = data.message || 'Erro ao verificar dados.';
                setTimeout(() => {
                    messageEl.textContent = '';
                }, 5000);
                return false;
            } catch (error) {
                console.error('Erro ao verificar nome e e-mail:', error);
                messageEl.textContent = 'Erro ao verificar dados. Tente novamente.';
                setTimeout(() => {
                    messageEl.textContent = '';
                }, 5000);
                return false;
            }
        }    
        if (nextBtn) {
            nextBtn.addEventListener('click', async () => {
                if (validatePage() && currentPage < pages.length - 1) {
                    if (currentPage === 0) {
                        const canProceed = await checkNameAndEmailExistence();
                        if (canProceed) {
                            currentPage++;
                            updateForm();
                            messageEl.textContent = '';
                        }
                    } else {
                        currentPage++;
                        updateForm();
                        messageEl.textContent = '';
                    }
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 0) {
                    currentPage--;
                    updateForm();
                }
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', async (event) => {
                event.preventDefault();

                if (!validatePage()) {
                    return;
                }

                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => {
                    data[key] = value;
                });

                data.status = "pendente";

                try {
                    const response = await fetch(form.action, {
                        method: form.method,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert('Cadastro enviado para aprovação. Aguarde a liberação do administrador.');
                        window.location.href = '/';
                    } else {
                        alert(result.message || 'Erro ao enviar os dados.');
                    }
                } catch (error) {
                    console.error('Erro ao enviar os dados:', error);
                    alert('Erro ao processar a solicitação. Tente novamente.');
                }
            });
        }
        updateForm();
        updateFields();
    }

    if (isDashboard) {
        if (!isTokenValid()) {
            checkTokenAndShowLogout();
            updateLoginButton();
            window.location.href = '/login'; // Redireciona para a página de login se o token não for válido
        }
    }    
    if (isUsers) {
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

        
        //Carrega os conteúdos únicos e preenche o select de conteúdos.
        
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
                            districtField.value = ""; // Limpa o valor
                            districtField.style.display = "none"; // Esconde
                        }
                        if (schoolField) {
                            schoolField.value = ""; // Limpa o valor
                            schoolField.style.display = "none"; // Esconde
                        }
                        if (contentField) {
                            contentField.value = ""; // Limpa o valor
                            contentField.style.display = "none"; // Esconde
                        }
                        if (classField) {
                            classField.value = ""; // Limpa o valor
                            classField.style.display = "none"; // Esconde
                        }
                    } else if (role === "Inspetor") {
                        // Esconder e limpar o campo "school" para o cargo "Inspetor"
                        if (schoolField) {
                            schoolField.value = ""; // Limpa o valor
                            schoolField.style.display = "none"; // Esconde
                        }
                        // Apenas mostrar Distrito e Cargo para o Inspetor
                        if (districtField) {
                            districtField.style.display = "block";
                            districtField.value = district;
                        } 
                        if (roleField) roleField.style.display = "block";

                        // Esconder os campos de Conteúdo e Turma
                        if (contentField) contentField.style.display = "none";
                        if (classField) classField.style.display = "none";
                    } else {
                        // Mostrar/ocultar campos com base na seleção do cargo
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
                    if (districtFilter) districtFilter.value = "";
                    if (schoolFilter) schoolFilter.value = "";
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
            fetch(`/users/${userId}`)
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
            fetch('/users', {
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
            fetch(`/users/${userId}`)
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
        
                    // Selecionar as opções corretas
                    document.getElementById('editSchool').value = data.schoolId || '';
                    document.getElementById('editDistrict').value = data.districtId || '';
        
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

                    if (schoolSelect && gradeSelect) {
                        if (data.schoolId) {
                            const grades = await fetchGradesBySchool(data.schoolId);
                            updateGradeSelect(grades);
                        }
                    }
        
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
                    if (school.id == schoolId) {
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
                const response = await fetch(`/grades?schoolId=${schoolId}`);
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

        // Função para reiniciar a senha de um usuário
        function resetPassword() {
            const userId = document.getElementById('resetPasswordUserId').value;
            
            // Exibir popup de loading
            showLoading();
            
            // Enviar a requisição para resetar a senha
            fetch(`/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, resetByAdmin: true }) // Incluindo o ID do usuário e a flag resetByAdmin
            })
            .then(response => response.json())  // Tratando a resposta como JSON
            .then(data => {
                if (data.message === 'Senha redefinida com sucesso para a senha padrão.') {
                    hideLoadingWithMessage(`Senha redefinida com sucesso! Nova senha: ${data.novaSenha}`, () => {
                        location.reload();  // Recarregar a página após a redefinição
                    });
                } else {
                    hideLoadingWithMessage('Erro ao reiniciar a senha');
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
        
    if(isGrade){
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
// Exemplo de função para atualizar a interface com os usuários filtrados
function atualizarListaUsuarios(users) {
    const usersContainer = document.getElementById("usersContainer"); // Altere para o ID correto do container
    if (!usersContainer) return;

    usersContainer.innerHTML = ""; // Limpa a lista antes de atualizar

    users.forEach(user => {
        const userElement = document.createElement("div");
        userElement.classList.add("user-item");
        userElement.innerHTML = `<strong>${user.name}</strong> - ${user.role}`;
        usersContainer.appendChild(userElement);
    });
}
// Função showPopup para usar com Promise
function showPopup(message, callback) {
    const popup = document.getElementById("generic-popup");
    const messageContainer = popup.querySelector(".popup-message");
    const okButton = popup.querySelector(".popup-ok-button");

    // Define a mensagem no popup
    messageContainer.textContent = message;

    // Exibe o popup
    popup.classList.remove("hidden");

    // Garante que o botão OK esteja visível
    okButton.style.display = "inline-block";

    // Evita que o popup seja fechado ao clicar fora
    popup.removeEventListener('click', closePopup);  // Removido para garantir que o clique fora não feche
    popup.addEventListener('click', function (e) {
        e.stopPropagation(); // Impede que o clique fora do conteúdo feche o popup
    });

    // Retorna uma Promise para aguardar o clique do usuário
    return new Promise((resolve, reject) => {
        // Adiciona o evento de clique no botão OK para fechar o popup
        okButton.onclick = () => {
            popup.classList.add("hidden");  // Oculta o popup
            resolve();  // Resolva a Promise quando o botão OK for clicado
            if (callback) callback();  // Chama o callback, se fornecido
        };
    });
}
// Se precisar de um listener de fechamento ao clicar fora, deixe isso:
function closePopup(event) {
    const popup = document.getElementById("generic-popup");
    if (event.target === popup) {
        popup.classList.add("hidden");
    }
}
function showLoading() {
    const popup = document.getElementById("generic-popup");
    const messageContainer = popup.querySelector(".popup-message");
    const okButton = popup.querySelector(".popup-ok-button");
    messageContainer.textContent = "Carregando...";
    okButton.style.display = "none";
    popup.classList.remove("hidden");
}
// Função para ocultar o carregamento
function hideLoading() {
    const popup = document.getElementById("generic-popup");
    popup.classList.add("hidden");  // Oculta o popup (esconde o "Carregando...")
}
function hideLoadingWithMessage(message, callback = null) {
    const popup = document.getElementById("generic-popup");
    const messageContainer = popup.querySelector(".popup-message");
    const okButton = popup.querySelector(".popup-ok-button");
    messageContainer.textContent = message;
    okButton.style.display = "inline-block";
    okButton.onclick = () => {
        popup.classList.add("hidden");
        if (callback) callback();
    };
}
const addAuthHeader = (url, options = {}) => {
    const token = localStorage.getItem('token'); 
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        };
    }
    return fetch(url, options);
};
// Obtém o ícone de menu e o menu
const menuToggle = document.getElementById('menu-toggle');
const menu = document.querySelector('.menu');
// Adiciona um ouvinte de evento para alternar o menu
menuToggle.addEventListener('click', () => {
    menu.classList.toggle('active'); // Alterna a visibilidade do menu
});
function updateLoginButton() {
    const loginButton = document.getElementById('login-button');
    const token = localStorage.getItem('token');

    if (token) {
        loginButton.textContent = 'Dashboard';
        loginButton.href = '/dashboard';
    } else {
        loginButton.textContent = 'Login';
        loginButton.href = '/login';
    }
}
// Função para mostrar o botão de logout se o token existir
function checkTokenAndShowLogout() {
    const token = localStorage.getItem('token');

    // Verifica se o token existe no localStorage
    if (token) {
        // Mostra o botão de logout se o token for encontrado
        document.getElementById('logout-btn').style.display = 'block';
    } else {
        // Esconde o botão de logout se não houver token
        document.getElementById('logout-btn').style.display = 'none';
    }
}
// Função de logout que limpa o token e redireciona para a página de login
async function logout() {
    try {
        // Faz uma requisição de logout ao servidor
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
            // Remove o token do localStorage
            localStorage.removeItem('token');
            sessionStorage.removeItem('userLoggedIn');
            sessionStorage.removeItem('popupShown');

            // Redireciona para a página de login ou página inicial
            window.location.href = '/login';
        } else {
            console.error('Erro ao fazer logout');
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}
function isTokenValid() {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('tokenExpiration');

    if (!token || !expiresAt) {
        return false; // Se não houver token ou expiração salva, o token não é válido
    }

    if (Date.now() >= parseInt(expiresAt)) {
        // Se a data atual já passou do tempo de expiração, remove o token e retorna falso
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiration');
        return false;
    }

    return true; // O token ainda é válido
}