// SERVICES
const userServices = {
    // Funções auxiliares para loading do select
    setSelectLoading(selectElement) {
        if (selectElement) {
            selectElement.disabled = true;
            selectElement.innerHTML = '<option value="">Carregando...</option>';
        }
    },

    resetSelect(selectElement, defaultText = "Selecione uma opção") {
        if (selectElement) {
            selectElement.disabled = false;
            selectElement.innerHTML = `<option value="">${defaultText}</option>`;
        }
    },

    async handleResponse(response) {
        // Se for 204, retorna sucesso sem conteúdo
        if (response.status === 204) {
            return { success: true };
        }
    
        const data = await response.json();
        
        // Se a resposta não for ok (200-299), trata como erro
        if (!response.ok) {
            throw {
                response: {
                    data: data,
                    status: response.status
                }
            };
        }
        
        return data;
    },

    async fetchWithLoading(url, options = {}) {
        try {
            userUtils.showLoading();
            const response = await fetch(url, options);
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Error:", error);
            throw error;
        } finally {
            userUtils.hideLoading();
        }
    },
    async createUser(userData) {
        try {
            const response = await this.fetchWithLoading("/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData)
            });
    
            // Se tem mensagem e não tem erro, é sucesso
            if (response.message && !response.error) {
                return {
                    success: true,
                    message: response.message
                };
            }
    
            // Se chegou aqui, trata como erro
            return {
                error: response.message || "Erro ao criar usuário"
            };
    
        } catch (error) {
            return {
                error: error.response?.data?.message || "Erro ao criar usuário"
            };
        }
    },

    async editUser(userId, userData) {
        return this.fetchWithLoading(`/users/edit/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });
    },

    async deleteUser(userId) {
        try {
            await this.fetchWithLoading(`/users/delete/${userId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });
            return { success: true };
        } catch (error) {
            throw new Error(error.response?.data?.message || "Erro ao excluir usuário");
        }
    },

    async resetPassword(userId) {
        try {
            const response = await this.fetchWithLoading('/users/reset-password', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            });
    
            // Se tem mensagem e não tem erro, é sucesso
            if (response.message && !response.error) {
                return response;
            }
    
            // Se chegou aqui, trata como erro
            throw { // Remover o new Error e manter a estrutura original
                response: {
                    data: {
                        message: response.message
                    }
                }
            };
    
        } catch (error) {
            // Repassa o erro mantendo a estrutura
            throw error; // Não criar novo Error aqui
        }
    },

    async loadContentOptions() {
        const contentSelect = document.getElementById('contentFilter');
        this.setSelectLoading(contentSelect);
        try {
            const response = await fetch('/subjects/list');
            const data = await this.handleResponse(response);
            return data;
        } finally {
            this.resetSelect(contentSelect, "Selecione uma disciplina");
        }
    },

    // No userServices, método loadAllGrades
    async loadAllGrades(schoolId = null) {
        const gradeSelect = document.getElementById('filterGrade');
        this.setSelectLoading(gradeSelect);
        try {
            const effectiveSchoolId = userUtils.getEffectiveSchoolId(schoolId);
            
            // Se tiver schoolId, busca apenas as turmas daquela escola
            const url = effectiveSchoolId ? `/grades/school/${effectiveSchoolId}` : '/grades/list';
            console.log(`Buscando turmas de: ${url}`);
            
            const response = await fetch(url);
            const data = await this.handleResponse(response);
            return data;
        } finally {
            this.resetSelect(gradeSelect, "Selecione uma turma");
        }
    },

    async fetchSchoolsByDistrict(districtId) {
        const schoolSelect = document.getElementById('filterSchool');
        this.setSelectLoading(schoolSelect);
        try {
            const response = await fetch(`/schools/list?districtId=${districtId}`);
            const data = await this.handleResponse(response);
            return data;
        } finally {
            this.resetSelect(schoolSelect, "Selecione uma escola");
        }
    },

    async fetchSchoolsBySchool(districtId, schoolId) {
        const response = await fetch(`/schools/list?districtId=${districtId}`);
        return await response.json();
    },

    async fetchGradesBySchool(schoolId) {
        console.log(schoolId);
        return this.fetchWithLoading(`/grades/school/${schoolId}`);
    },

    async loadSchools(district) {
        try {
            const response = await fetch(`/users/filter?districtId=${encodeURIComponent(district)}`);
            const data = await response.json();
            
            // Garantir que estamos pegando escolas do jeito certo
            return [...new Map(data.schools.map(school => [school.id, school])).values()];
        } catch (error) {
            console.error("Erro ao buscar escolas:", error);
            return [];
        }
    },

    async loadClasses(school) {
        const response = await fetch(`/grades/school/${school}`);
        return await response.json();
    },

    // Novo método para controle de loading do dropdown
    setDropdownLoading(selectElement, isLoading) {
        const parent = selectElement.parentElement;
        if (isLoading) {
            parent.classList.add('select-loading');
            // Adiciona spinner
            const spinner = document.createElement('div');
            spinner.className = 'select-spinner';
            parent.appendChild(spinner);
        } else {
            parent.classList.remove('select-loading');
            // Remove spinner se existir
            const spinner = parent.querySelector('.select-spinner');
            if (spinner) spinner.remove();
        }
    },

    // Modificar os métodos de carregamento de dropdowns
    async loadSchools(districtId) {
        const schoolSelect = document.getElementById('filterSchool');
        if (!schoolSelect) return;

        this.setDropdownLoading(schoolSelect, true);
        try {
            const response = await fetch(`/schools/list${districtId ? `?districtId=${districtId}` : ''}`);
            const schools = await response.json();
            
            // Atualiza as opções
            schoolSelect.innerHTML = '<option value="">Selecione uma escola</option>';
            schools.forEach(school => {
                const option = document.createElement('option');
                option.value = school.id;
                option.textContent = school.name;
                schoolSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar escolas:', error);
        } finally {
            this.setDropdownLoading(schoolSelect, false);
        }
    },

    // Adicionar ao objeto userServices em users.js
    async fetchPaginatedUsers(params = {}) {
        try {
            userUtils.showLoading();
            
            // Construir URL com parâmetros
            const queryParams = new URLSearchParams();
            
            // Adicionar parâmetros de filtro
            Object.entries(params).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });
            
            // Garantir parâmetros de paginação
            if (!params.page) queryParams.set('page', '1');
            if (!params.limit) queryParams.set('limit', '10');
            
            // Construir URL final
            const url = `/users/filter?${queryParams.toString()}`;
            
            // Atualizar URL do navegador
            const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
            window.history.pushState({}, '', newUrl);
            
            const response = await fetch(url);
            const data = await this.handleResponse(response);
            return data;
        } catch (error) {
            console.error("Error:", error);
            throw error;
        } finally {
            userUtils.hideLoading();
        }
    }
};

// HANDLERS
const userHandlers = {
  
        async openRegisterModal() {        
        try {
            // Reset de todos os campos do formulário
            document.getElementById('registerForm').reset();
            
            // Carregar conteúdos disponíveis
            const subjects = await userServices.loadContentOptions();
            userUtils.updateContentSelect(subjects, 'registerContent');
    
            const schoolSelect = document.getElementById('registerSchool');
            const districtId = document.getElementById('registerDistrict').value;
    
            // Setup inicial
            await userServices.fetchSchoolsByDistrict(districtId);
            
            if (schoolSelect.value) {
                // Determinar qual ID de escola usar com base no papel do usuário
                const userRole = document.getElementById("userRole")?.value;
                const userSchool = document.getElementById("userSchool")?.value;
                
                let effectiveSchoolId = schoolSelect.value;
                if (userRole && userSchool && userRole !== "Master" && userRole !== "Inspetor") {
                    console.log(`Usando escola do usuário (${userSchool}) em vez da selecionada (${schoolSelect.value})`);
                    effectiveSchoolId = userSchool;
                }
                
                const grades = await userServices.fetchGradesBySchool(effectiveSchoolId);
                userUtils.updateGradeSelect(grades, 'register');
            }
    
            userUtils.openModal('registerModal');
        } catch (error) {
            console.error('Erro:', error);
            userUtils.showError('Erro ao carregar dados iniciais');
        } 
    },
        
    async openEditModal(userId) {        
        try {
            const [userData, subjects] = await Promise.all([
                fetch(`/users/list/${userId}`).then(r => r.json()),
                userServices.loadContentOptions()
            ]);
            
            // Garantir que o ID está sendo definido
            document.getElementById("editUserId").value = userId;
            
            // Atualizar select de conteúdos
            userUtils.updateContentSelect(subjects, 'editContent', userData.content);
    
            // Preencher todos os campos
            const fields = [
                'id', 'name', 'username', 'email', 'cpf', 'phone', 'dateOfBirth', 
                'gender', 'role', 'horario', 'status', 'address', 'city', 
                'state', 'zip', 'districtId'
            ];
            
            fields.forEach(field => {
                const element = document.getElementById(`edit${field.charAt(0).toUpperCase() + field.slice(1)}`);
                if (element) {
                    if (field === 'dateOfBirth') {
                        element.value = new Date(userData[field]).toISOString().split('T')[0];
                    } else {
                        element.value = userData[field] || '';
                    }
                }
            });
    
            const contentSelect = document.getElementById('editContent');
            if (contentSelect && userData.content) {
                console.log(`Definindo disciplina/content: ${userData.content}`);
                
                setTimeout(() => {
                    contentSelect.value = userData.content;
                    if (contentSelect.value !== userData.content) {
                        Array.from(contentSelect.options).forEach(option => {
                            if (option.textContent === userData.content) {
                                option.selected = true;
                            }
                        });
                    }
                }, 100);
            }
    
            const districtSelect = document.getElementById('editDistrict');
            if (districtSelect && userData.districtId) {
                console.log(`Definindo district: ${userData.districtId}`);
                districtSelect.value = userData.districtId;
            }
    
            // Atualizar a visibilidade dos campos baseado na role
            userUtils.updateFieldsVisibility(userData.role, 'edit');
    
            // Carregar as escolas do distrito selecionado
            if (userData.districtId) {
                const schools = await userServices.fetchSchoolsBySchool(userData.districtId, userData.schoolId);
                
                // Atualizar o dropdown de escolas
                const schoolSelect = document.getElementById('editSchool');
                if (schoolSelect) {
                    schoolSelect.innerHTML = '<option value="">Selecione uma escola</option>';
                    schools.forEach(school => {
                        const option = document.createElement('option');
                        option.value = school.id;
                        option.textContent = school.name;
                        schoolSelect.appendChild(option);
                    });
                    
                    if (userData.schoolId) {
                        console.log(`Definindo escola: ${userData.schoolId}`);
                        setTimeout(() => {
                            schoolSelect.value = userData.schoolId;
                        }, 50);
                    }
                }
            }
    
            if (userData.schoolId) {
                const grades = await userServices.fetchGradesBySchool(userData.schoolId);
                userUtils.updateGradeSelect(grades, 'edit');
                
                const gradeSelect = document.getElementById('editGrade');
                if (gradeSelect && userData.gradeId) {
                    setTimeout(() => {
                        gradeSelect.value = userData.gradeId;
                    }, 100);
                }
            }
    
            userUtils.openModal('editModal');
        } catch (error) {
            console.error('Erro:', error);
            userUtils.showError('Erro ao carregar dados do usuário');
        } 
    },

    async openDeleteModal(userId) {
        try {
            const data = await fetch(`/users/list/${userId}`).then(r => r.json());
            
            // Preencher informações no modal
            const fields = ['name', 'email', 'role', 'status', 'createdAt'];
            fields.forEach(field => {
                const element = document.getElementById(`delete${field.charAt(0).toUpperCase() + field.slice(1)}`);
                if (element) {
                    if (field === 'createdAt') {
                        element.textContent = new Date(data[field]).toLocaleDateString('pt-BR');
                    } else {
                        element.textContent = data[field];
                    }
                }
            });

            document.getElementById('deleteUserId').value = data.id;
            userUtils.openModal('deleteModal');
        } catch (error) {
            console.error('Erro:', error);
            userUtils.showError('Erro ao carregar dados do usuário');
        }
    },
       async handleCreateUser(event) {
        console.log('Início do handleCreateUser');
    
        try {
            // Coletar dados do formulário
            const fields = {
                name: document.getElementById("registerName"),
                username: document.getElementById("registerUsername"),
                email: document.getElementById("registerEmail"),
                role: document.getElementById("registerRole"),
                district: document.getElementById("registerDistrict"),
                school: document.getElementById("registerSchool"),
                cpf: document.getElementById("registerCpf"),
                phone: document.getElementById("registerPhone"),
                dateOfBirth: document.getElementById("registerDateOfBirth"),
                gender: document.getElementById("registerGender"),
                content: document.getElementById("registerContent"),
                grade: document.getElementById("registerGrade"),
                horario: document.getElementById("registerHorario"),
                address: document.getElementById("registerAddress"),
                city: document.getElementById("registerCity"),
                state: document.getElementById("registerState"),
                zip: document.getElementById("registerZip")
            };

            console.log('Fields coletados:', fields);

            // Verificar campos obrigatórios
            const missingFields = [];
            for (const [key, element] of Object.entries(fields)) {
                console.log(`Verificando campo ${key}:`, element);
                if (!element) {
                    missingFields.push(key);
                }
            }

            console.log('Campos ausentes:', missingFields);

            if (missingFields.length > 0) {
                console.log('Campos obrigatórios faltando');
                userUtils.showError(`Campos não encontrados: ${missingFields.join(', ')}`);
                return;
            }

            console.log('Passou da verificação de campos obrigatórios');
            // Criar objeto com os valores
            // Se passou da verificação, criar objeto com os valores
            const userData = {
                name: fields.name.value.trim().toUpperCase(), // Converter para UPPERCASE
                username: fields.username.value.trim(),
                email: fields.email.value.trim(),
                role: fields.role.value,
                districtId: fields.district.value,
                schoolId: fields.school.value,
                cpf: fields.cpf.value.trim(),
                phone: fields.phone.value.trim(),
                dateOfBirth: fields.dateOfBirth.value,
                gender: fields.gender.value,
                content: fields.content.value,
                gradeId: fields.grade.value,
                horario: fields.horario.value,
                address: fields.address.value.trim(),
                city: fields.city.value.trim(),
                state: fields.state.value.trim(),
                zip: fields.zip.value.trim()
            };
    
            // Validações específicas por tipo de usuário
            switch (userData.role) {
                case 'Master':
                    userData.schoolId = null;
                    userData.districtId = null;
                    userData.content = null;
                    userData.gradeId = null;
                    break;
                case 'Inspetor':
                    if (!userData.districtId) {
                        throw new Error('Inspetor precisa ter uma regional definida');
                    }
                    userData.schoolId = null;
                    userData.content = null;
                    userData.gradeId = null;
                    break;
                case 'Professor':
                    if (!userData.content) {
                        throw new Error('Professor precisa ter uma disciplina definida');
                    }
                    if (!userData.schoolId) {
                        throw new Error('Professor precisa ter uma escola definida');
                    }
                    userData.gradeId = null;
                    break;
                case 'Aluno':
                    if (!userData.gradeId) {
                        throw new Error('Aluno precisa ter uma turma definida');
                    }
                    if (!userData.schoolId) {
                        throw new Error('Aluno precisa ter uma escola definida');
                    }
                    userData.content = null;
                    break;
                default:
                    if (!userData.schoolId) {
                        throw new Error('Usuário precisa ter uma escola definida');
                    }
                    userData.content = null;
                    userData.gradeId = null;
            }
    
            // Validar dados antes de enviar
            try {
                userUtils.validateUserData(userData);
            } catch (error) {
                userUtils.showError(error.message); // Mostrar erro ao usuário
                return;
            }
    
            // Enviar dados
            const result = await userServices.createUser(userData);
        
            if (result.error) {
                userUtils.showError(result.error);
                return;
            }

            // Verifica se o status é 201 (Created)
            if (result.message) {
                await new Promise(resolve => {
                    userUtils.showSuccess(result.message);
                    setTimeout(() => {
                        userUtils.closeModal();
                        resolve();
                    }, 1500);
                });
                location.reload();
                return;
            }

        } catch (error) {
            userUtils.showError(error.message || "Erro ao criar usuário");
            console.error("Error:", error);
        }
    },

        async handleEditUser(userId) {
        try {            
            // Primeiro, verificar se o userId existe
            if (!userId) {
                throw new Error('ID do usuário não encontrado');
            }
    
            // Criar um objeto para armazenar os campos
             const fields = {
                name: document.getElementById("editName"),
                username: document.getElementById("editUsername"),
                email: document.getElementById("editEmail"),
                role: document.getElementById("editRole"),
                district: document.getElementById("editDistrict"),
                school: document.getElementById("editSchool"),
                cpf: document.getElementById("editCpf"),
                phone: document.getElementById("editPhone"),
                dateOfBirth: document.getElementById("editDateOfBirth"),
                gender: document.getElementById("editGender"),
                content: document.getElementById("editContent"),
                grade: document.getElementById("editGrade"),
                horario: document.getElementById("editHorario"),
                address: document.getElementById("editAddress"),
                city: document.getElementById("editCity"),
                state: document.getElementById("editState"),
                zip: document.getElementById("editZip"),
                status: document.getElementById("editStatus")
            };
    
            // Verificar se todos os campos existem
            const missingFields = Object.entries(fields)
                .filter(([key, element]) => !element)
                .map(([key]) => key);
    
            if (missingFields.length > 0) {
                throw new Error(`Campos não encontrados: ${missingFields.join(', ')}`);
            }
    
            // Criar objeto userData apenas com campos que existem
            const userData = {
                name: fields.name.value.trim().toUpperCase(), // Converter para UPPERCASE
                username: fields.username.value,
                email: fields.email.value,
                role: fields.role.value,
                districtId: fields.district.value,
                schoolId: fields.school.value,
                cpf: fields.cpf.value,
                phone: fields.phone.value,
                dateOfBirth: fields.dateOfBirth.value,
                gender: fields.gender.value,
                content: fields.content.value,
                horario: fields.horario.value,
                address: fields.address.value,
                city: fields.city.value,
                state: fields.state.value,
                zip: fields.zip.value,
                status: fields.status.value
            };
    
            // CORREÇÃO: Tratar o gradeId corretamente baseado no papel do usuário
            if (userData.role === 'Aluno') {
                // Para alunos, gradeId deve ser um número
                userData.gradeId = fields.grade.value ? parseInt(fields.grade.value, 10) : null;
                // Validar se é número válido
                if (userData.gradeId === null || isNaN(userData.gradeId)) {
                    throw new Error('Alunos precisam ter uma turma (ID numérico) definida');
                }
                userData.content = null; // Alunos não possuem content (disciplina)
            } else if (userData.role === 'Professor') {
                // Professores não possuem gradeId, deve ser null e não string vazia
                userData.gradeId = null;
                // Mas precisam ter content (disciplina)
                if (!userData.content) {
                    throw new Error('Professores precisam ter uma disciplina definida');
                }
            } else {
                // Outros perfis não têm gradeId nem content
                userData.gradeId = null;
                userData.content = null;
            }
    
            // Validar dados
            try {
                userUtils.validateUserData(userData);
            } catch (error) {
                userUtils.showError(error.message);
                return;
            }
    
            // Console para debug
            console.log('Dados enviados para edição:', JSON.stringify(userData));
    
            const result = await userServices.editUser(userId, userData);
    
            if (result.error) {
                userUtils.showError(result.error);
                return;
            }
    
            userUtils.showSuccess('Usuário atualizado com sucesso!');
            setTimeout(() => {
                userUtils.closeModal();
                location.reload();
            }, 1500);
        } catch (error) {
            const errorMessage = error.message || "Erro ao atualizar usuário";
            console.error("Error:", error);
            userUtils.showError(errorMessage);
        }
    },

    async handleDeleteUser(userId) {
        try {
            const result = await userServices.deleteUser(userId);

            if (result.error) {
                userUtils.showError(result.error);
                return;
            }

            userUtils.showSuccess('Usuário excluído com sucesso!'); // Adicionar mensagem de sucesso
            setTimeout(() => {
                userUtils.closeModal();
                location.reload();
            }, 1500);
        } catch (error) {
            userUtils.showError("Erro ao excluir usuário");
            console.error("Error:", error);
        }
    },

    async handleResetPassword(userId) {
        try {
            const result = await userServices.resetPassword(userId);
            
            if (result.message === 'Senha resetada com sucesso!') {
                userUtils.hideLoadingWithMessage(`Senha redefinida com sucesso! Nova senha: ${result.novaSenha}`);
                setTimeout(() => location.reload(), 1500);
            }
        } catch (error) {
            // Agora o error.response.data.message estará disponível
            const errorMessage = error.response?.data?.message || "Erro ao resetar senha";
            userUtils.showError(errorMessage);
            console.error("Error:", error);
        }
    },

    async handleSchoolChange(districtId) {
        try {
            const schools = await userServices.fetchSchoolsByDistrict(districtId);
            const schoolSelect = document.getElementById("registerSchool");
            schoolSelect.innerHTML = '<option value="">Selecione uma escola</option>';
            schools.forEach(school => {
                const option = document.createElement("option");
                option.value = school.id;
                option.textContent = school.name;
                schoolSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error:", error);
            userUtils.showError("Erro ao carregar escolas");
        }
    },
    
    async handleGradeChange(schoolId) {
        try {
            const effectiveSchoolId = userUtils.getEffectiveSchoolId(schoolId);
            
            const response = await userServices.fetchGradesBySchool(effectiveSchoolId);
            const gradeSelect = document.getElementById("registerGrade");
            gradeSelect.innerHTML = '<option value="">Selecione uma turma</option>';
            
            // Verificar a estrutura da resposta e extrair o array de turmas
            const gradesArray = Array.isArray(response) ? response : 
                Array.isArray(response.data) ? response.data :
                [];
            
            // Console para debug
            console.log('Dados de turmas recebidos:', response);
            console.log('Array de turmas extraído:', gradesArray);
            console.log('Escola efetiva usada:', effectiveSchoolId);
            
            // Iterar sobre o array
            gradesArray.forEach(grade => {
                const option = document.createElement("option");
                option.value = grade.id;
                option.textContent = grade.name;
                gradeSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error:", error);
            const gradeSelect = document.getElementById("registerGrade");
            gradeSelect.innerHTML = '<option value="">Erro ao carregar turmas</option>';
            userUtils.showError("Erro ao carregar turmas");
        }
    },

    setupListeners() {
        this.ListenerBtnEdit = this.ListenerBtnEdit.bind(this);
        this.ListenerBtnDelete = this.ListenerBtnDelete.bind(this);
        this.listenerBtnReset = this.listenerBtnReset.bind(this);
        this.setupGradeEditSelectListener = this.setupGradeEditSelectListener.bind(this);
        this.setupGradeRegisterSelectListener = this.setupGradeRegisterSelectListener.bind(this);

        this.ListenerBtnEdit();
        this.ListenerBtnDelete();
        this.listenerBtnReset();
        this.setupGradeEditSelectListener();
        this.setupGradeRegisterSelectListener();
    },

    ListenerBtnEdit() {
        const btnEdit = document.querySelectorAll('.btn-edit');
        if(btnEdit) {
            btnEdit.forEach(button => {
            button.addEventListener('click', async () => {
                    const userId = button.getAttribute('data-user-id');
                    this.openEditModal(userId);
                });
            });
        }
    },

    ListenerBtnDelete() {
        const btnDelete = document.querySelectorAll('.btn-delete');
        if(btnDelete) {
            btnDelete.forEach(button => {
                button.addEventListener('click', () => {
                    const userId = button.getAttribute('data-user-id');
                    this.openDeleteModal(userId); // Chama o modal primeiro
                });
            });
        }
    },

    listenerBtnReset() {
        const btnReset = document.querySelectorAll('.btn-reset-password');
        if (btnReset) {
            btnReset.forEach(button => {
                button.addEventListener('click', () => {
                    const userId = button.getAttribute('data-user-id');
                    this.handleResetPassword(userId);
                });
            });
        }
    },

    setupGradeEditSelectListener() {
        const schoolSelect = document.getElementById('editSchool');
        const gradeSelect = document.getElementById('editGrade');

        if (schoolSelect && gradeSelect) {
            schoolSelect.addEventListener('change', async () => {
                const schoolId = schoolSelect.value;
                if (schoolId) {
                    const effectiveSchoolId = userUtils.getEffectiveSchoolId(schoolId);
                    const grades = await userServices.fetchGradesBySchool(effectiveSchoolId);
                    userUtils.updateGradeSelect(grades, 'edit');
                } else {
                    gradeSelect.innerHTML = '<option value="">Selecione uma turma</option>';
                }
            });
        }
    },

    setupGradeRegisterSelectListener() {
        const schoolSelect = document.getElementById('registerSchool');
        const gradeSelect = document.getElementById('registerGrade');
            
        if (schoolSelect && gradeSelect) {
            schoolSelect.addEventListener('change', async () => {
                const schoolId = schoolSelect.value;
                if (schoolId) {
                    const effectiveSchoolId = userUtils.getEffectiveSchoolId(schoolId);
                    const grades = await userServices.fetchGradesBySchool(effectiveSchoolId);
                    userUtils.updateGradeSelect(grades, 'register');
                } else {
                    gradeSelect.innerHTML = '<option value="">Selecione uma escola</option>';
                }
            });
        }
    }
};
// UTILS
const userUtils = {

    showInfo(message) {
        this.showPopup(message, 'info');
    },

    async updateContentSelect(subjects, selectId, selectedValue = null) {
        const contentSelect = document.getElementById(selectId);
        if (!contentSelect) return;

        // Limpar select existente
        contentSelect.innerHTML = '<option value="">Selecione uma disciplina</option>';
        
        // Verificar se temos dados
        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            console.warn("Nenhuma disciplina disponível");
            return;
        }
        
        // Adicionar opções
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            
            // Se temos um valor selecionado, verificar correspondência
            if (selectedValue && (subject.id == selectedValue || subject.name == selectedValue)) {
                option.selected = true;
            }
            
            contentSelect.appendChild(option);
        });
        
        // Verificar se alguma opção foi selecionada automaticamente
        if (selectedValue && contentSelect.value !== selectedValue) {
            console.log(`Disciplina ${selectedValue} não encontrada automaticamente, verificando...`);
            
            // Tentativa de encontrar pela string ou ID
            let found = false;
            
            // Procurar por correspondência parcial no nome
            Array.from(contentSelect.options).forEach(option => {
                if (!found && option.textContent.includes(selectedValue) || 
                    option.value == selectedValue) {
                    option.selected = true;
                    found = true;
                    console.log(`Disciplina encontrada: ${option.textContent}`);
                }
            });
        }
    },

    updateGradeSelect(grades, type = 'register') {
        const gradeSelect = document.getElementById(`${type}Grade`);
        if (!gradeSelect) return;

        const gradesArray = Array.isArray(grades) ? grades : 
                        Array.isArray(grades?.data) ? grades.data :
                        [];

        gradeSelect.innerHTML = '<option value="">Selecione uma turma</option>';
        gradesArray.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade.id;
            option.textContent = type === 'edit' ? 
                `${grade.name} - ${grade.shift}` :
                `${grade.name} - ${grade.shift}`;
            gradeSelect.appendChild(option);
        });
    },

    async updateContentSelect(subjects, type) {
        const contentSelect = document.getElementById(`${type}`);
        if (!contentSelect) return;
    
        contentSelect.innerHTML = '<option value="">Selecione uma disciplina</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            contentSelect.appendChild(option);
        });
    },

    async handleFilterUsers(event) {
        event?.preventDefault();
        try {
            // Coletar valores dos filtros
            const districtId = document.getElementById("filterDistrict")?.value || "";
            let schoolId = document.getElementById("filterSchool")?.value || "";
            const role = document.getElementById("roleFilter")?.value || "";
            const content = document.getElementById("contentFilter")?.value || "";
            const grade = document.getElementById("filterGrade")?.value || "";
            const status = document.getElementById("statusFilter")?.value || "";

            // Determinar qual ID de escola usar com base no papel do usuário
            const userRole = document.getElementById("userRole")?.value;
            const userSchool = document.getElementById("userSchool")?.value;
            
            if (userRole !== "Master" && userRole !== "Inspetor") {
                schoolId = userSchool;
            }

            // Construir parâmetros de consulta
            const queryParams = {
                page: 1, // Ao filtrar, sempre voltar para a página 1
                limit: 10 // Valor padrão para itens por página
            };
            
            // Adicionar filtros aos parâmetros apenas se tiverem valor
            if (districtId) queryParams.districtId = districtId;
            if (schoolId) queryParams.schoolId = schoolId;
            if (role) queryParams.role = role;
            if (content) queryParams.content = content;
            if (grade) queryParams.gradeId = grade;
            if (status) queryParams.status = status;
            
            // Buscar dados com os filtros e paginação
            const data = await userServices.fetchPaginatedUsers(queryParams);
            
            // Atualizar a tabela
            this.updateTable(data);
        } catch (error) {
            console.error("Error:", error);
            this.showError("Erro ao filtrar usuários");
        }
    },

    validateUserData(userData) {
        const fieldNames = {
            name: 'Nome',
            username: 'Username',
            email: 'E-mail',
            role: 'Função',
            cpf: 'CPF',
            phone: 'Telefone',
            dateOfBirth: 'Data de Nascimento',
            gender: 'Gênero',
            address: 'Endereço',
            city: 'Cidade',
            state: 'Estado',
            zip: 'CEP'
        };

        const requiredFields = ['name', 'username', 'email', 'role'];
        
        const emptyFields = requiredFields.filter(field => !userData[field]);
        
        if (emptyFields.length > 0) {
            const missingFieldNames = emptyFields.map(field => fieldNames[field] || field);
            throw new Error(`Por favor, preencha os campos obrigatórios: ${missingFieldNames.join(', ')}`);
        }

        // Validações específicas por tipo
        if (userData.role === 'Professor' && (!userData.content || !userData.schoolId)) {
            throw new Error('Professores precisam ter disciplina e escola definidos');
        }

        if (userData.role === 'Aluno' && (!userData.gradeId || !userData.schoolId)) {
            throw new Error('Alunos precisam ter turma e escola definidos');
        }

        return true;
    },

    openModal(modalId) {
        const modalContainer = document.querySelector('.modalContainer');
        const targetModal = document.getElementById(modalId);
        
        // Esconde todos os modais primeiro
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(modal => {
            modal.hidden = true;
            modal.style.display = 'none';
        });
        
        if (modalContainer && targetModal) {
            modalContainer.hidden = false;
            targetModal.hidden = false;
            targetModal.style.display = 'block';
            modalContainer.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Remover listener antigo
            if (this.handleOutsideClick) {
                modalContainer.removeEventListener('click', this.handleOutsideClick);
            }
            
            // Adicionar novo listener
            this.handleOutsideClick = (e) => {
                if (e.target === modalContainer) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal();
                }
            };
            
            modalContainer.addEventListener('click', this.handleOutsideClick);
        }
    },

    closeModal() {
        const modalContainer = document.querySelector('.modalContainer');
        const allModals = document.querySelectorAll('.modal');
        
        if (modalContainer) {
            modalContainer.hidden = true;
            modalContainer.style.display = 'none';
            
            // Remove o evento ao fechar
            modalContainer.removeEventListener('click', this.handleOutsideClick);
            
            allModals.forEach(modal => {
                modal.hidden = true;
                modal.style.display = 'none';
            });
            
            document.body.style.overflow = 'auto';
        }
    },

    formatDateToBR(date) {
        if (!date) return '';
        return date.split('-').reverse().join('/');
    },

    formatDateToISO(date) {
        if (!date) return '';
        return date.split('/').reverse().join('-');
    },
    
    updateTable(data) {
        const tbody = document.querySelector('table tbody');
        if (!tbody) {
            console.error("Tabela não encontrada");
            return;
        }
    
        tbody.innerHTML = '';
    
        if (data && Array.isArray(data.users)) {
            // Se não houver usuários, mostrar mensagem na tabela
            if (data.users.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="6" class="no-results">
                        <div class="no-results-message">
                            <i class="fas fa-search"></i>
                            <p>Nenhum usuário encontrado com os critérios de busca selecionados.</p>
                            <p>Tente outros filtros ou <button id="resetFilters" class="btn-link">limpar filtros</button>.</p>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
                
                // Adicionar event listener para o botão de limpar filtros
                setTimeout(() => {
                    document.getElementById('resetFilters')?.addEventListener('click', () => {
                        document.getElementById('cleanFilter')?.click();
                    });
                }, 100);
                
                return;
            }

            // Manter a lógica existente de ordenação e exibição dos usuários
            const sortedUsers = data.users.sort((a, b) => {
                if (a.status === 'inactive' && b.status !== 'inactive') return -1;
                if (a.status !== 'inactive' && b.status === 'inactive') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            sortedUsers.forEach(user => {
                // Manter o código existente de renderizar cada linha
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
                        <button class="btn btn-delete" data-user-id="${user.id}" 
                            data-user-name="${user.name}" 
                            data-user-email="${user.email}" 
                            data-user-role="${user.role}" 
                            data-user-status="${user.status}" 
                            data-user-createdAt="${user.createdAt}">Excluir</button>
                        <button class="btn btn-reset-password" data-user-id="${user.id}">
                            Reiniciar Senha</button>
                    </td>
                `;
                
                tbody.appendChild(tr);
            });

            // Renderizar controles de paginação
            if (data.pagination) {
                this.renderPaginationControls(data);
            }
        }
        
        // Reinstalar listeners nos botões
        userHandlers.setupListeners();
    },

    addClearTableListeners() {
        const filters = document.querySelectorAll('#filterDistrict, #filterSchool, #roleFilter, #contentFilter, #filterGrade, #statusFilter');
        const filterButton = document.getElementById("filterUsers");
        
        // Flag para determinar se estamos no carregamento inicial
        let initialLoading = true;
        
        // Após 1.5 segundos, consideramos que o carregamento inicial terminou
        setTimeout(() => {
            initialLoading = false;
        }, 1500);
        
        // Adicionar indicador visual de filtros não aplicados
        let filtersChanged = false;
        
        filters.forEach(filter => {
            if (filter) {
                filter.addEventListener("change", () => {
                    // Ignorar eventos durante carregamento inicial
                    if (initialLoading) return;
                    
                    // Ignorar quando o valor é vazio e o texto é "Carregando..."
                    if (filter.value === "" && filter.options[0].text === "Carregando...") return;
                    
                    // Marcar que os filtros foram alterados
                    filtersChanged = true;
                    
                    // Adicionar indicador visual ao botão de filtrar
                    if (filterButton) {
                        filterButton.classList.add('filter-pending');
                        filterButton.textContent = 'Aplicar Filtros';
                    }
                    
                    // Adicionar indicação acima da tabela
                    const filterAlert = document.getElementById('filter-alert') || document.createElement('div');
                    filterAlert.id = 'filter-alert';
                    filterAlert.className = 'filter-alert';
                    filterAlert.innerHTML = '<i class="fas fa-info-circle"></i> Você tem filtros não aplicados. Clique em "Aplicar Filtros" para ver os resultados.';
                    
                    const tableContainer = document.querySelector('table').parentElement;
                    if (!document.getElementById('filter-alert')) {
                        tableContainer.insertBefore(filterAlert, tableContainer.firstChild);
                    }
                });
            }
        });
        
        // Limpar indicador quando filtrar
        if (filterButton) {
            filterButton.addEventListener('click', () => {
                filtersChanged = false;
                filterButton.classList.remove('filter-pending');
                filterButton.textContent = 'Filtrar';
                const filterAlert = document.getElementById('filter-alert');
                if (filterAlert) filterAlert.remove();
            });
        }
    },

    addRoleChangeListener() {
        const roleField = document.getElementById("roleFilter");
        if (roleField) {
            roleField.addEventListener("change", function() {
                const role = roleField.value;
                const fields = {
                    contentField: document.getElementById("contentFilter"),
                    classField: document.getElementById("filterGrade"),
                    districtField: document.getElementById("filterDistrict"),
                    schoolField: document.getElementById("filterSchool")
                };
    
                // Esconde todos os campos primeiro
                Object.values(fields).forEach(field => {
                    if (field) field.style.display = "none";
                });
    
                // Mostra campos específicos baseado na role
                switch(role) {
                    case "Master":
                        break;
                    case "Inspetor":
                        // Mostra apenas distrito
                        if (fields.districtField) fields.districtField.style.display = "block";
                        break;
                    case "Diretor":
                        // Mostra distrito e escola
                        if (fields.districtField) fields.districtField.style.display = "block";
                        if (fields.schoolField) fields.schoolField.style.display = "block";
                        break;
                    case "Secretario":
                        // Mostra distrito e escola, mas não disciplina nem turma
                        if (fields.districtField) fields.districtField.style.display = "block";
                        if (fields.schoolField) fields.schoolField.style.display = "block";
                        break;
                    case "Coordenador":
                        // Mostra distrito e escola, mas não disciplina nem turma
                        if (fields.districtField) fields.districtField.style.display = "block";
                        if (fields.schoolField) fields.schoolField.style.display = "block";
                        break;
                    case "Pedagogo":
                        // Mostra distrito e escola, mas não disciplina nem turma
                        if (fields.districtField) fields.districtField.style.display = "block";
                        if (fields.schoolField) fields.schoolField.style.display = "block";
                        break;
                    case "Professor":
                        // Mostra todos exceto turma
                        Object.values(fields).forEach(field => {
                            if (field) field.style.display = "block";
                        });
                        if (fields.classField) fields.classField.style.display = "none";
                        break;
                    case "Aluno":
                        // Mostra todos exceto conteúdo
                        Object.values(fields).forEach(field => {
                            if (field) field.style.display = "block";
                        });
                        if (fields.contentField) fields.contentField.style.display = "none";
                        break;
                    default:
                        // Mostra todos os campos
                        Object.values(fields).forEach(field => {
                            if (field) field.style.display = "block";
                        });
                }
            });
    
            // Acionar o evento change inicialmente para configurar a visibilidade
            roleField.dispatchEvent(new Event('change'));
        }
    },

    addClearFilterListener() {
        const clearButton = document.getElementById("cleanFilter");
        if (clearButton) {
            clearButton.addEventListener("click", async () => {
                const filters = ["roleFilter", "contentFilter", "classFilter", "statusFilter"]
                    .map(id => document.getElementById(id));
                
                filters.forEach(filter => {
                    if (filter) filter.value = "";
                });

                const fields = ["filterDistrict", "filterSchool", "roleFilter", 
                            "contentFilter", "classFilter", "statusFilter"]
                    .map(id => document.getElementById(id));
                
                fields.forEach(field => {
                    if (field) field.style.display = "block";
                });

                try {
                    const response = await fetch("/users/filter");
                    if (!response.ok) throw new Error(`Erro ao buscar usuários`);
                    const data = await response.json();
                    this.updateTable(data);
                } catch (error) {
                    console.error("Error:", error);
                    this.showError("Erro ao limpar filtros");
                }
            });
        }
    },
    
    showPopup(message, type = 'info') {
        console.log('ShowPopup chamado com:', {message, type}); // Debug
        const popup = document.getElementById('message-popup');
        const messageText = document.getElementById('message-text');
        const popupContainer = document.querySelector('.popup-container');
        const saveButton = document.querySelector('.btn-save');
        const closeButton = document.querySelector('.close-popup'); // Adicionar esta linha
        
        if (!popup || !messageText || !popupContainer) {
            console.error('Elementos de popup não encontrados');
            return;
        }
    
        // Reset classes
        popup.classList.remove('success', 'error', 'info');
        
        // Adicionar classe de tipo
        popup.classList.add(type);
        
        messageText.textContent = message;
        
        // Mostrar popup e container
        popupContainer.style.display = 'flex';
        popup.style.display = 'block';

        // Adicionar evento de clique no botão fechar
        if (closeButton) {
            closeButton.onclick = () => {
                popup.style.display = 'none';
                popup.classList.remove(type);
                popupContainer.style.display = 'none';
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.classList.remove('disabled');
                }
            };
        }

        // Desabilitar botão salvar
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.classList.add('disabled');
        }
    
        // Auto hide após 3 segundos
        if (type !== 'info') {
            setTimeout(() => {
                popup.style.display = 'none';
                popup.classList.remove(type);
                // Verificar se o loading está visível antes de esconder o container
                const loading = document.getElementById('loading');
                if (loading?.hidden !== false) {
                    popupContainer.style.display = 'none';
                }
                // Reabilitar botão salvar
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.classList.remove('disabled');
                }
            }, 3000);
        }
    },

    showError(message) {
        console.log('Tentando mostrar erro:', message); // Debug
        this.showPopup(message, 'error');
    },

    showSuccess(message) {
        console.log('ShowSuccess chamado com:', message); // Debug
        this.showPopup(message, 'success');
    },


    showLoading() {
        const loading = document.getElementById('loading');
        const popupContainer = document.querySelector('.popup-container');
        if (loading && popupContainer) {
            loading.hidden = false;
            popupContainer.style.display = 'flex'; 
            document.body.classList.add('loading-active');
        }
    },

    hideLoading(message = '', callback = null) {
        const loading = document.getElementById('loading');
        const popupContainer = document.querySelector('.popup-container');
        
        if (loading && popupContainer) {
            loading.hidden = true;
            popupContainer.style.display = 'none'; // Mudança aqui
            document.body.classList.remove('loading-active');
            
            if (message) {
                this.showPopup(message, 'success');
                if (callback) {
                    setTimeout(callback, 1500);
                }
            }
        }
    },

    hideLoadingWithMessage(message, callback) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.remove();
        }
        this.showSuccess(message);
        if (callback) {
            setTimeout(callback, 1500);
        }
    },
    
    updateFieldsVisibility(role, type = 'register') {
        const prefix = type === 'register' ? 'register' : 'edit';
    
        // Buscar elementos com verificação de null
        const contentField = document.getElementById(`${prefix}Content`)?.parentElement;
        const classField = document.getElementById(`${prefix}Grade`)?.parentElement; // Changed from Class to Grade
        const schoolField = document.getElementById(`${prefix}School`);
        const schoolLabel = schoolField ? document.querySelector(`label[for="${schoolField.id}"]`) : null;
        const districtField = document.getElementById(`${prefix}District`);
        const districtLabel = districtField ? document.querySelector(`label[for="${districtField.id}"]`) : null;
        const horarioField = document.getElementById(`${prefix}Horario`);
        const horarioLabel = horarioField ? document.querySelector(`label[for="${horarioField.id}"]`) : null;

        // Verificar se todos os elementos necessários existem
        if (!contentField || !classField || !schoolField || !schoolLabel || 
            !districtField || !districtLabel || !horarioField || !horarioLabel) {
            console.warn(`Alguns elementos não foram encontrados para o tipo ${type}`);
            return;
        }

        // Lógica completa de visibilidade baseada em roles
        if (role === 'Professor') {
            contentField.style.display = 'block';
            classField.style.display = 'none';
            schoolField.style.display = 'block';
            schoolLabel.style.display = 'block';
            districtField.style.display = 'block';
            districtLabel.style.display = 'block';
            horarioField.style.display = 'block';
            horarioLabel.style.display = 'block';
        } else if (role === 'Aluno') {
            contentField.style.display = 'none';
            classField.style.display = 'block';
            schoolField.style.display = 'block';
            schoolLabel.style.display = 'block';
            districtField.style.display = 'block';
            districtLabel.style.display = 'block';
            horarioField.style.display = 'block';
            horarioLabel.style.display = 'block';
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
    },

    // Adicionar este método ao userUtils
    getEffectiveSchoolId(selectedSchoolId) {
        // Determinar qual ID de escola usar com base no papel do usuário
        const userRole = document.getElementById("userRole")?.value;
        const userSchool = document.getElementById("userSchool")?.value;
        
        if (userRole !== "Master" && userRole !== "Inspetor") {
            console.log(`Usando escola do usuário (${userSchool}) em vez da selecionada (${selectedSchoolId})`);
            return userSchool;
        }
        
        return selectedSchoolId;
    },

    setupFilterFieldsHighlight() {
        // Adicionar classe 'has-filter' aos selects que têm um valor selecionado
        const filterSelects = document.querySelectorAll('.filter-fields select, .filter-fields input');
        
        // Inicialização - verificar valores iniciais
        filterSelects.forEach(field => {
            if (field.value) {
                field.classList.add('has-filter');
            }
            
            // Atualizar classe quando o valor mudar
            field.addEventListener('change', function() {
                if (this.value) {
                    this.classList.add('has-filter');
                } else {
                    this.classList.remove('has-filter');
                }
            });
        });
        
        // Remover classe has-filter quando o botão limpar for clicado
        const cleanFilterBtn = document.getElementById('cleanFilter');
        if (cleanFilterBtn) {
            cleanFilterBtn.addEventListener('click', function() {
                setTimeout(() => {
                    filterSelects.forEach(field => {
                        field.classList.remove('has-filter');
                    });
                }, 100);
            });
        }
    },

    renderPaginationControls(data) {
        // Verificar se temos dados de paginação
        if (!data.pagination) return;
        
        const { totalItems, totalPages, currentPage, itemsPerPage } = data.pagination;
        
        // Atualizar informações de total
        document.getElementById('items-shown').textContent = 
            Math.min(itemsPerPage, totalItems - (currentPage - 1) * itemsPerPage);
        document.getElementById('total-items').textContent = totalItems;
        
        // Configurar botões de navegação
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        
        if (prevButton) {
            prevButton.disabled = currentPage <= 1;
            prevButton.onclick = () => this.changePage(currentPage - 1);
        }
        
        if (nextButton) {
            nextButton.disabled = currentPage >= totalPages;
            nextButton.onclick = () => this.changePage(currentPage + 1);
        }
        
        // Renderizar números de página
        const pageNumbers = document.getElementById('page-numbers');
        if (!pageNumbers) return;
        
        pageNumbers.innerHTML = '';
        
        // Determinar quais páginas mostrar
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        // Adicionar primeira página
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'page-number';
            firstPageBtn.textContent = '1';
            firstPageBtn.onclick = () => this.changePage(1);
            pageNumbers.appendChild(firstPageBtn);
            
            // Adicionar elipses se necessário
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'page-ellipsis';
                pageNumbers.appendChild(ellipsis);
            }
        }
        
        // Adicionar páginas numéricas
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this.changePage(i);
            pageNumbers.appendChild(pageBtn);
        }
        
        // Adicionar última página
        if (endPage < totalPages) {
            // Adicionar elipses se necessário
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'page-ellipsis';
                pageNumbers.appendChild(ellipsis);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'page-number';
            lastPageBtn.textContent = totalPages;
            lastPageBtn.onclick = () => this.changePage(totalPages);
            pageNumbers.appendChild(lastPageBtn);
        }
    },
    
    // Método para mudar de página
    async changePage(page) {
        try {
            userUtils.showLoading();
            
            // Obter parâmetros atuais da URL
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', page);
            
            // Buscar dados com a nova página
            const data = await userServices.fetchPaginatedUsers(Object.fromEntries(urlParams));
            
            // Atualizar a tabela com os novos dados
            this.updateTable(data);
        } catch (error) {
            console.error('Erro ao mudar de página:', error);
            this.showError('Erro ao carregar a página ' + page);
        } finally {
            userUtils.hideLoading();
        }
    },
    
    // Método para ler parâmetros da URL
    getUrlParams() {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    }

};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async function() {
    const isUsers = window.location.pathname.includes("users");
    if (!isUsers) return;

    
    try {

        // Verificar mensagem de usuários inativos
        const showPopupButton = document.getElementById("inactiveUsersMessage");
        if (showPopupButton) {
            try {
                const response = await fetch('/users/me');
                const userData = await response.json();
                
                if (userData.role === "Master") {
                    const message = showPopupButton.getAttribute("data-message");
                    userUtils.showPopup(message, 'info');
                }
            } catch (error) {
                console.error('Erro ao buscar dados do usuário:', error);
            }
        }

        // Setup Event Listeners
        document.getElementById("addUsers").addEventListener("click", () => userUtils.openModal("registerModal"));
        document.getElementById("registerForm").addEventListener("submit", (e) => {
            e.preventDefault();
            userHandlers.handleCreateUser(e);
        });
        document.getElementById("editForm")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const userId = document.getElementById("editUserId")?.value;
            if (!userId) {
                userUtils.showError("ID do usuário não encontrado");
                return;
            }
            await userHandlers.handleEditUser(userId);
        });
        document.getElementById("registerDistrict").addEventListener("change", (e) => {
            userHandlers.handleSchoolChange(e.target.value);
        });

        // Close modal listeners
        document.querySelectorAll(".close, .btn-cancel").forEach(button => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevenir propagação do evento
                userUtils.closeModal();
            });
        });

        // Filtros de distrito e escola
        const userRole = document.getElementById("userRole").value;
        if (userRole === "Master" || userRole === "Inspetor") {
            document.getElementById("filterDistrict")?.addEventListener("change", async (event) => {
                const district = event.target.value;
                await userServices.loadSchools(district);
            });
        }

        document.getElementById("filterSchool")?.addEventListener("change", async (event) => {
            const school = event.target.value;
            await userServices.loadClasses(school);
        });

        // Adicionar listener para resetar senha
        document.querySelector('.btn-confirm-reset')?.addEventListener('click', (e) => {
            e.preventDefault();
            const userId = document.getElementById('resetPasswordUserId').value;
            userHandlers.handleResetPassword(userId);
        });

        // Botão de filtrar
        const filterButton = document.getElementById("filterUsers");
        if (filterButton) {
            filterButton.addEventListener("click", function(event) {
                userUtils.handleFilterUsers(event); // Mudado de userHandlers para userUtils
            });
        }
        // Carregar dados iniciais uma única vez
        try {
            // Carregar conteúdos e turmas em paralelo
            const [subjects] = await Promise.all([
                userServices.loadContentOptions()
            ]);

            // Preencher todos os selects de conteúdo
            userUtils.updateContentSelect(subjects, 'contentFilter');  // Filtro
            userUtils.updateContentSelect(subjects, 'registerContent'); // Modal de registro
            userUtils.updateContentSelect(subjects, 'editContent');    // Modal de edição

        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }

        // Adicionar listeners e setup inicial
        userHandlers.setupListeners();
        userUtils.addClearTableListeners();
        userUtils.addRoleChangeListener();
        userUtils.addClearFilterListener();
        userUtils.setupFilterFieldsHighlight();

        // Close pop-up listener
        const closePopup = document.getElementById("close-popup");
        if (closePopup) {
            closePopup.addEventListener("click", () => {
                const popup = document.getElementById("generic-popup");
                popup.classList.add("hidden");
            });
        }

        document.getElementById("deleteForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const userId = document.getElementById("deleteUserId").value;
            await userHandlers.handleDeleteUser(userId);
        });
        
    const userSchool = document.getElementById("userSchool")?.value;
    
    if (userRole && userSchool && userRole !== "Master" && userRole !== "Inspetor") {
        // No filtro, desabilitar a seleção de escola e definir o valor como a escola do usuário
        const schoolFilterSelect = document.getElementById("filterSchool");
        if (schoolFilterSelect) {
            // Quando o schoolFilter for carregado, selecionar automaticamente a escola do usuário
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        schoolFilterSelect.value = userSchool;
                        schoolFilterSelect.disabled = true;
                        observer.disconnect();
                        
                        // Disparar evento de change para carregar as turmas
                        schoolFilterSelect.dispatchEvent(new Event('change'));
                        
                        // Carregar as turmas diretamente (adição)
                        setTimeout(async () => {
                            try {
                                console.log(`Carregando turmas da escola do usuário (${userSchool})`);
                                const grades = await userServices.fetchGradesBySchool(userSchool);
                                userUtils.updateGradeSelect(grades, 'filter');
                            } catch (error) {
                                console.error('Erro ao carregar turmas:', error);
                            }
                        }, 300);
                    }
                }
            });
            
            observer.observe(schoolFilterSelect, { childList: true });
        }
    }
     } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        userUtils.showError('Erro ao carregar dados iniciais');
    } 

    // Adicionar listeners para mudanças de role nos formulários
    const registerRole = document.getElementById('registerRole');
    const editRole = document.getElementById('editRole');

    if (registerRole) {
        registerRole.addEventListener('change', function() {
            userUtils.updateFieldsVisibility(this.value, 'register');
        });
        // Inicializar a visibilidade com o valor atual
        userUtils.updateFieldsVisibility(registerRole.value, 'register');
    }

    if (editRole) {
        editRole.addEventListener('change', function() {
            userUtils.updateFieldsVisibility(this.value, 'edit');
        });
    }

    // Quando o modal de registro é aberto, atualizar a visibilidade
    document.getElementById("addUsers").addEventListener("click", () => {
        userUtils.openModal("registerModal");
        userUtils.updateFieldsVisibility(registerRole.value, 'register');
    });

    const schoolFilterSelect = document.getElementById("filterSchool");
    if (schoolFilterSelect) {
        schoolFilterSelect.addEventListener("change", async function() {
            const schoolId = schoolFilterSelect.value;
            console.log('Escola selecionada:', schoolId); // Debug
            if (schoolId) {
                const effectiveSchoolId = userUtils.getEffectiveSchoolId(schoolId);
                // Buscar turmas apenas da escola efetiva (selecionada ou do usuário)
                const grades = await userServices.loadAllGrades(effectiveSchoolId);
                userUtils.updateGradeSelect(grades, 'filter');
            } else {
                // Se não tiver escola selecionada, limpar o select de turmas
                const gradeSelect = document.getElementById('filterGrade');
                if (gradeSelect) {
                    gradeSelect.innerHTML = '<option value="">Selecione uma escola primeiro</option>';
                }
            }
        });
    }
        
    try {
        // Carregar apenas conteúdos (disciplinas) inicialmente
        const subjects = await userServices.loadContentOptions();
        
        // Preencher todos os selects de conteúdo
        userUtils.updateContentSelect(subjects, 'contentFilter');  // Filtro
        userUtils.updateContentSelect(subjects, 'registerContent'); // Modal de registro
        userUtils.updateContentSelect(subjects, 'editContent');    // Modal de edição
        
        // Lógica para carregamento inicial das turmas baseado no papel do usuário
        const gradeSelect = document.getElementById('filterGrade');
        const userRole = document.getElementById("userRole")?.value;
        const userSchool = document.getElementById("userSchool")?.value;
        
        if (gradeSelect) {
            if (userRole && userSchool && userRole !== "Master" && userRole !== "Inspetor") {
                // Para usuários não-admin, carregar as turmas da sua escola automaticamente
                gradeSelect.innerHTML = '<option value="">Carregando turmas...</option>';
                
                try {
                    console.log(`Carregando turmas da escola do usuário (${userSchool}) no carregamento inicial`);
                    const grades = await userServices.fetchGradesBySchool(userSchool);
                    userUtils.updateGradeSelect(grades, 'filter');
                } catch (error) {
                    console.error('Erro ao carregar turmas:', error);
                    gradeSelect.innerHTML = '<option value="">Erro ao carregar turmas</option>';
                }
            } else {
                // Para admin, manter a mensagem para selecionar escola
                gradeSelect.innerHTML = '<option value="">Selecione uma escola primeiro</option>';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
    }

    // Verificar se existem parâmetros de paginação na URL ao carregar
    try {
        const urlParams = userUtils.getUrlParams();
        if (Object.keys(urlParams).length > 0) {
            // Se existem parâmetros na URL, usá-los para o carregamento inicial
            const data = await userServices.fetchPaginatedUsers(urlParams);
            userUtils.updateTable(data);
            
            // Preencher os campos de filtro com os valores da URL
            if (urlParams.districtId) {
                const districtSelect = document.getElementById('filterDistrict');
                if (districtSelect) districtSelect.value = urlParams.districtId;
                
                // Carregar escolas do distrito selecionado
                if (userRole === "Master" || userRole === "Inspetor") {
                    await userServices.loadSchools(urlParams.districtId);
                }
            }
            
            if (urlParams.schoolId) {
                const schoolSelect = document.getElementById('filterSchool');
                if (schoolSelect) {
                    setTimeout(() => {
                        schoolSelect.value = urlParams.schoolId;
                        schoolSelect.dispatchEvent(new Event('change'));
                    }, 300);
                }
            }
            
            // Preencher outros campos de filtro
            const fieldMappings = {
                'role': 'roleFilter',
                'content': 'contentFilter',
                'gradeId': 'filterGrade',
                'status': 'statusFilter'
            };
            
            Object.entries(fieldMappings).forEach(([param, fieldId]) => {
                if (urlParams[param]) {
                    const field = document.getElementById(fieldId);
                    if (field) field.value = urlParams[param];
                }
            });
        }
    } catch (error) {
        console.error('Erro ao processar parâmetros da URL:', error);
    }
    
    // Carregar os usuários com paginação no carregamento inicial
    (async function loadInitialUsersWithPagination() {
        try {
            userUtils.showLoading();
            
            // Obter role e school do usuário atual
            const userRole = document.getElementById("userRole")?.value;
            const userSchool = document.getElementById("userSchool")?.value;
            const userDistrict = document.getElementById("filterDistrict")?.value;
            
            // Construir parâmetros iniciais para filtro com paginação
            const initialParams = {
                page: 1,
                limit: 10
            };
            
            // Aplicar filtros baseados no papel do usuário
            if (userRole !== "Master" && userRole !== "Inspetor") {
                // Para usuários não admin, filtrar por sua própria escola
                initialParams.schoolId = userSchool;
            } else if (userRole === "Inspetor" && userDistrict) {
                // Para inspetores, filtrar por seu distrito
                initialParams.districtId = userDistrict;
            }
            
            // Verificar se existem parâmetros na URL que devem sobrescrever os defaults
            const urlParams = userUtils.getUrlParams();
            if (Object.keys(urlParams).length > 0) {
                // Combinar parâmetros da URL com os iniciais
                Object.assign(initialParams, urlParams);
            }
            
            console.log("Carregando usuários com parâmetros:", initialParams);
            
            // Buscar dados com paginação
            const data = await userServices.fetchPaginatedUsers(initialParams);
            
            // Atualizar tabela com dados paginados
            userUtils.updateTable(data);
            
        } catch (error) {
            console.error("Erro ao carregar usuários iniciais:", error);
        } finally {
            userUtils.hideLoading();
        }
    })();
});