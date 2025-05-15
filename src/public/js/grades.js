document.addEventListener('DOMContentLoaded', function() {
    const isGrade = window.location.pathname.includes("grades");
    if(isGrade){

        // Set current year as default
        const yearInputs = document.querySelectorAll('input[type="number"][name="year"]');
        yearInputs.forEach(input => {
            input.value = new Date().getFullYear();
        });

        // Global State
        let currentGradeId = null;
        let deleteGradeId = null;
        
        // User data from hidden fields
        const userRole = document.getElementById('userRole').value;
        const userDistrictId = document.getElementById('userDistrictId').value;
        const userSchoolId = document.getElementById('userSchoolId').value;

        // DOM Elements - updated with new class names
        const DOM = {
            filters: {
                container: document.querySelector('.grades-filters'),
                filterGroup: document.querySelector('.grades-filter-group'),
                districtSelect: document.getElementById('districtSelect'),
                schoolSelect: document.getElementById('schoolSelect')
            },
            tables: {
                gradeBody: document.getElementById('gradeTableBody')
            },
            modals: {
                grade: document.getElementById('gradeModal'),
                delete: document.getElementById('deleteModal'),
                modalDistrictSelect: document.getElementById('modalDistrictSelect'),
                modalSchoolSelect: document.getElementById('modalSchoolSelect')
            },
            forms: {
                grade: document.getElementById('gradeForm')
            },
            buttons: {
                addGrade: document.getElementById('addGrade'),
                confirmDelete: document.getElementById('confirmDelete'),
                closeModals: document.querySelectorAll('.close-modal')
            },
            userData: {
                role: userRole,
                districtId: userDistrictId,
                schoolId: userSchoolId
            }
        };

        // Carregar dados iniciais baseado na role
        async function loadInitialData() {
            try {
                const userRole = DOM.userData.role;
                const userDistrictId = DOM.userData.districtId;
                const userSchoolId = DOM.userData.schoolId;

                if (userRole === 'Master') {
                    // Master vê todas as turmas inicialmente
                    const grades = await GradeService.getByDistrict(null);
                    UIHelpers.updateGradesTable(grades.data);
                } else if (userRole === 'Inspetor') {
                    // Inspetor vê todas as turmas do seu distrito
                    if (userDistrictId) {
                        const grades = await GradeService.getByDistrict(userDistrictId);
                        UIHelpers.updateGradesTable(grades.data);
                    }
                } else {
                    // Outros roles veem apenas as turmas da sua escola
                    if (userSchoolId) {
                        const grades = await GradeService.getBySchool(userSchoolId);
                        UIHelpers.updateGradesTable(grades.data);
                    }
                }
            } catch (error) {
                console.error('Error loading initial data:', error);
                UIHelpers.showToast('Erro ao carregar dados', 'error');
            }
        }

        // Event Listeners Setup
        function initializeEventListeners() {
            if (DOM.filters.districtSelect) {
                DOM.filters.districtSelect.addEventListener('change', async (e) => {
                    const select = e.target;
                    select.disabled = true;
                    await handleDistrictChange(e);
                    select.disabled = false;
                });
            }
        
            if (DOM.filters.schoolSelect) {
                DOM.filters.schoolSelect.addEventListener('change', async (e) => {
                    const select = e.target;
                    select.disabled = true;
                    await handleSchoolChange(e);
                    select.disabled = false;
                });
            }
        
            if (DOM.buttons.addGrade) {
                DOM.buttons.addGrade.addEventListener('click', (e) => {
                    const button = e.currentTarget;
                    debounceButton(button);
                    openGradeModal();
                });
            }
        
            // Close modal buttons
            DOM.buttons.closeModals.forEach(button => {
                button.addEventListener('click', (e) => {
                    debounceButton(e.currentTarget);
                    closeAllModals();
                });
            });
        
            // Form submit
            DOM.forms.grade.addEventListener('submit', async (e) => {
                const submitButton = e.target.querySelector('button[type="submit"]');
                debounceButton(submitButton);
                await handleGradeSubmit(e);
            });
        
            // Confirm delete
            DOM.buttons.confirmDelete.addEventListener('click', async (e) => {
                const button = e.currentTarget;
                debounceButton(button);
                await handleGradeDelete();
            });
        
            // Close modals when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === DOM.modals.grade || e.target === DOM.modals.delete) {
                    closeAllModals();
                }
            });

            // Debug initialization
            console.log('DOM Elements Initialized:', {
                districtSelect: !!DOM.filters.districtSelect,
                schoolSelect: !!DOM.filters.schoolSelect,
                gradeBody: !!DOM.tables.gradeBody
            });
        }
        
        // API Service Functions
        const GradeService = {
            async getBySchool(schoolId) {
                const response = await fetch(`/grades/school/${schoolId}`);
                return response.json();
            },

            async getByDistrict(districtId) {
                const response = await fetch(`/grades/district/${districtId}`);
                return response.json();
            },

            async getById(id) {
                const response = await fetch(`/grades/${id}`);
                if (!response.ok) {
                    throw new Error('Falha ao buscar dados da turma');
                }
                return response.json();
            },

            async create(gradeData) {
                const response = await fetch('/grades/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gradeData)
                });
                return response.json();
            },
        
            async update(id, gradeData) {
                const response = await fetch(`/grades/edit/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gradeData)
                });
                return response.json();
            },
        
            async delete(id) {
                const response = await fetch(`/grades/delete/${id}`, {
                    method: 'DELETE'
                });
                return response.json();
            }
        };

        // Service layer for schools
        const SchoolService = {
            async getByDistrict(districtId) {
                try {
                    const response = await fetch(`/schools/list?districtId=${districtId}`);
                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.error('Error fetching schools:', error);
                    throw error;
                }
            }
        };
        
        // UI Helper Functions
        const UIHelpers = {
            showToast(message, type = 'success') {
                const toast = document.getElementById('toast');
                const toastMessage = toast.querySelector('.toast-message');
                
                toast.className = `toast ${type}`;
                toastMessage.textContent = message;
                toast.classList.add('show');
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            },
        
            updateGradesTable(grades) {
                const tableBody = DOM.tables.gradeBody;
                tableBody.innerHTML = '';

                if (!grades || grades.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">Nenhuma turma encontrada</td>
                        </tr>`;
                    return;
                }

                // Check for inactive grades and show warning toast
                if (grades.some(grade => grade.status === 'inactive')) {
                    this.showToast('Existem turmas com status inativo aguardando aprovação.', 'warning');
                }
            
                grades.forEach(grade => {
                    const row = document.createElement('tr');
                    row.classList.add('grade-row');
                    if (grade.status === 'inactive') row.classList.add('inactive-grade');
            
                    row.innerHTML = `
                        <td>${grade.name}</td>
                        <td>${grade.schoolName}</td>
                        <td>${grade.districtName}</td>
                        <td>${grade.year}</td>
                        <td>${grade.shift}</td>
                        <td>
                            <span class="status-badge ${grade.status}">
                                ${grade.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td class="actions-column">
                            <button class="btn btn-edit" onclick="editGrade(${grade.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn btn-delete" onclick="deleteGrade(${grade.id})" title="Excluir">
                                🗑️
                            </button>
                        </td>
                    `;
            
                    tableBody.appendChild(row);
                });
            },
        
            resetForm(form) {
                form.reset();
                currentGradeId = null;
            }
        };
        
        // Event Handlers
        async function handleDistrictChange(e) {
            const districtId = e.target.value;
            const schoolSelect = DOM.filters.schoolSelect;
            
            try {
                // Reset and disable school select initially
                schoolSelect.disabled = true;
        
                if (!districtId) {
                    schoolSelect.innerHTML = '<option value="">Selecione um distrito primeiro</option>';
                    return;
                }
        
                // Show loading state
                schoolSelect.innerHTML = '<option value="">Carregando escolas...</option>';
        
                // Debug log
                console.log('Fetching schools for district:', districtId);
        
                // Fetch schools for selected district
                const response = await SchoolService.getByDistrict(districtId);
                const schools = Array.isArray(response) ? response : response.data;
        
                // Debug log
                console.log('Schools received:', schools);
        
                if (schools && schools.length > 0) {
                    // Populate school select
                    schoolSelect.innerHTML = '<option value="">Todas as escolas</option>';
                    schools.forEach(school => {
                        const option = new Option(school.name, school.id);
                        schoolSelect.add(option);
                    });
        
                    // Enable school select only if we have schools
                    schoolSelect.disabled = false;
                } else {
                    schoolSelect.innerHTML = '<option value="">Nenhuma escola encontrada</option>';
                }
        
                // Fetch and update grades
                const grades = await GradeService.getByDistrict(districtId);
                UIHelpers.updateGradesTable(grades.data);
        
            } catch (error) {
                console.error('Error in handleDistrictChange:', error);
                schoolSelect.innerHTML = '<option value="">Erro ao carregar escolas</option>';
                UIHelpers.showToast('Erro ao carregar escolas', 'error');
            }
        }
        
        async function handleSchoolChange(e) {
            const schoolId = e.target.value;
            try {
                if (!schoolId) {
                    // If "Todas as escolas" is selected, show grades for current district
                    const districtId = DOM.filters.districtSelect.value;
                    if (districtId) {
                        const grades = await GradeService.getByDistrict(districtId);
                        UIHelpers.updateGradesTable(grades.data);
                    }
                    return;
                }
        
                // Fetch grades for selected school
                const grades = await GradeService.getBySchool(schoolId);
                UIHelpers.updateGradesTable(grades.data);
        
            } catch (error) {
                UIHelpers.showToast('Erro ao carregar turmas', 'error');
                console.error('Erro:', error);
            }
        }
        
        async function handleGradeSubmit(e) {
            e.preventDefault();
            
            try {
                const formData = new FormData(e.target);
                const gradeData = {
                    name: formData.get('name'),
                    year: parseInt(formData.get('year')),
                    shift: formData.get('shift'),
                    startDate: formData.get('startDate'),
                    endDate: formData.get('endDate'),
                    description: formData.get('description'),
                    status: formData.get('status') 
                };

                // Add schoolId and districtId based on user role
                if (DOM.userData.role === 'Master') {
                    gradeData.schoolId = formData.get('schoolId');
                    gradeData.districtId = formData.get('districtId');
                } else if (DOM.userData.role === 'Inspetor') {
                    gradeData.schoolId = formData.get('schoolId');
                    gradeData.districtId = DOM.userData.districtId;
                } else {
                    gradeData.schoolId = DOM.userData.schoolId;
                    gradeData.districtId = DOM.userData.districtId;
                }

                let response;
                if (currentGradeId) {
                    response = await GradeService.update(currentGradeId, gradeData);
                } else {
                    response = await GradeService.create(gradeData);
                }

                // Check for validation errors in the response
                if (response.status === 'error') {
                    const errorMessages = response.errors
                        .map(err => `${err.field}: ${err.message}`)
                        .join('\n');
                    UIHelpers.showToast(`Erro de validação:\n${errorMessages}`, 'error');
                    return;
                }

                // If successful, update the table
                let grades;
                if (DOM.userData.role === 'Master') {
                    const selectedDistrictId = DOM.filters.districtSelect.value;
                    const selectedSchoolId = DOM.filters.schoolSelect.value;
                    
                    if (selectedSchoolId) {
                        grades = await GradeService.getBySchool(selectedSchoolId);
                    } else if (selectedDistrictId) {
                        grades = await GradeService.getByDistrict(selectedDistrictId);
                    }
                } else if (DOM.userData.role === 'Inspetor') {
                    grades = await GradeService.getByDistrict(DOM.userData.districtId);
                } else {
                    grades = await GradeService.getBySchool(DOM.userData.schoolId);
                }

                UIHelpers.updateGradesTable(grades.data);
                UIHelpers.showToast(currentGradeId ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!');

                // Close modal and reset form
                closeAllModals();
                UIHelpers.resetForm(DOM.forms.grade);

            } catch (error) {
                console.error('Error submitting grade:', error);
                UIHelpers.showToast('Erro ao salvar turma', 'error');
            }
        }

        async function handleGradeDelete() {
            try {
                if (!deleteGradeId) {
                    UIHelpers.showToast('Erro ao excluir turma: ID não fornecido', 'error');
                    return;
                }

                await GradeService.delete(deleteGradeId);
                UIHelpers.showToast('Turma excluída com sucesso!');

                // Update table based on user role
                let grades;
                if (DOM.userData.role === 'Master') {
                    const selectedDistrictId = DOM.filters.districtSelect.value;
                    const selectedSchoolId = DOM.filters.schoolSelect.value;
                    
                    if (selectedSchoolId) {
                        grades = await GradeService.getBySchool(selectedSchoolId);
                    } else if (selectedDistrictId) {
                        grades = await GradeService.getByDistrict(selectedDistrictId);
                    }
                } else if (DOM.userData.role === 'Inspetor') {
                    grades = await GradeService.getByDistrict(DOM.userData.districtId);
                } else {
                    grades = await GradeService.getBySchool(DOM.userData.schoolId);
                }

                UIHelpers.updateGradesTable(grades.data);

                // Close delete modal and reset state
                closeAllModals();
                deleteGradeId = null;

            } catch (error) {
                console.error('Error deleting grade:', error);
                UIHelpers.showToast('Erro ao excluir turma', 'error');
            }
        }
        
        // Modal Functions
        async function openGradeModal(gradeData = null) {
            try {
                const form = DOM.forms.grade;

                // Reset form first
                UIHelpers.resetForm(form);

                 // Set current year as default for new grades
                if (!gradeData) {
                    form.querySelector('[name="year"]').value = new Date().getFullYear();
                }

                if (DOM.userData.role === 'Master') {
                    // For Master, check both selects
                    const modalDistrictSelect = DOM.modals.modalDistrictSelect;
                    const modalSchoolSelect = DOM.modals.modalSchoolSelect;
                    
                    if (!modalDistrictSelect || !modalSchoolSelect) {
                        console.error('Required modal elements not found:', {
                            districtSelect: !!modalDistrictSelect,
                            schoolSelect: !!modalSchoolSelect
                        });
                        UIHelpers.showToast('Erro ao abrir modal: elementos não encontrados', 'error');
                        return;
                    }

                    // Master can select both district and school
                    modalDistrictSelect.disabled = false;
                    modalSchoolSelect.disabled = true;
                    modalSchoolSelect.innerHTML = '<option value="">Selecione um distrito primeiro</option>';

                    // Add event listener for district change
                    modalDistrictSelect.addEventListener('change', async (e) => {
                        const select = e.currentTarget;
                        select.disabled = true;
                        const districtId = e.target.value;
                        
                        // Reset and disable school select initially
                        modalSchoolSelect.disabled = true;
        
                        if (!districtId) {
                            modalSchoolSelect.innerHTML = '<option value="">Selecione um distrito primeiro</option>';
                            return;
                        }
        
                        // Show loading state
                        modalSchoolSelect.innerHTML = '<option value="">Carregando escolas...</option>';
        
                        try {
                            const response = await SchoolService.getByDistrict(districtId);
                            const schools = Array.isArray(response) ? response : response.data;
        
                            if (schools && schools.length > 0) {
                                modalSchoolSelect.innerHTML = '<option value="">Selecione uma escola</option>';
                                schools.forEach(school => {
                                    modalSchoolSelect.add(new Option(school.name, school.id));
                                });
                                modalSchoolSelect.disabled = false;
                            } else {
                                modalSchoolSelect.innerHTML = '<option value="">Nenhuma escola encontrada</option>';
                            }
                        } catch (error) {
                            console.error('Error loading schools:', error);
                            modalSchoolSelect.innerHTML = '<option value="">Erro ao carregar escolas</option>';
                        }

                        select.disabled = false;
                    });
        
                } else if (DOM.userData.role === 'Inspetor') {
                    const modalSchoolSelect = DOM.modals.modalSchoolSelect;
            
                    if (!modalSchoolSelect) {
                        console.error('School select not found');
                        UIHelpers.showToast('Erro ao abrir modal: escola não encontrada', 'error');
                        return;
                    }

                    // Load schools for inspector's district
                    try {
                        const response = await SchoolService.getByDistrict(DOM.userData.districtId);
                        const schools = Array.isArray(response) ? response : response.data;

                        if (schools && schools.length > 0) {
                            modalSchoolSelect.innerHTML = '<option value="">Selecione uma escola</option>';
                            schools.forEach(school => {
                                modalSchoolSelect.add(new Option(school.name, school.id));
                            });
                            modalSchoolSelect.disabled = false;
                        } else {
                            modalSchoolSelect.innerHTML = '<option value="">Nenhuma escola encontrada</option>';
                        }
                    } catch (error) {
                        console.error('Error loading schools:', error);
                        modalSchoolSelect.innerHTML = '<option value="">Erro ao carregar escolas</option>';
                        return;
                    }
                }
                // For other roles, no need to check selects as they use hidden fields

                // If editing, populate form with grade data
                if (gradeData) {
                    currentGradeId = gradeData.id;
                    Object.keys(gradeData).forEach(key => {
                        const input = form.querySelector(`[name="${key}"]`);
                        if (input) {
                            input.value = gradeData[key];
                        }
                    });
                }

                DOM.modals.grade.style.display = 'block';
            } catch (error) {
                console.error('Error in openGradeModal:', error);
                UIHelpers.showToast('Erro ao abrir modal', 'error');
            }
        }
        
        function closeAllModals() {
            DOM.modals.grade.style.display = 'none';
            DOM.modals.delete.style.display = 'none';
        }

        // Move the functions inside the scope
        async function editGrade(gradeId) {
            try {
                // Prevent double click
                const editButton = event.currentTarget;
                editButton.disabled = true;

                // Get grade data
                const response = await GradeService.getById(gradeId);
                if (!response.data) {
                    throw new Error('Dados da turma não encontrados');
                }

                const grade = response.data;

                // Populate modal fields
                currentGradeId = grade.id;
                const form = DOM.forms.grade;

                // Basic fields
                form.querySelector('[name="name"]').value = grade.name;
                form.querySelector('[name="year"]').value = grade.year;
                form.querySelector('[name="shift"]').value = grade.shift;

                
                // Date fields - format dates for input type="date"
                if (grade.startDate) {
                    form.querySelector('[name="startDate"]').value = grade.startDate.split('T')[0];
                }
                if (grade.endDate) {
                    form.querySelector('[name="endDate"]').value = grade.endDate.split('T')[0];
                }

                // Description field
                form.querySelector('[name="description"]').value = grade.description || '';

                // Handle district and school based on user role
                if (DOM.userData.role === 'Master') {
                    const modalDistrictSelect = DOM.modals.modalDistrictSelect;
                    const modalSchoolSelect = DOM.modals.modalSchoolSelect;

                    modalDistrictSelect.value = grade.districtId;
                    // Trigger district change to load schools
                    await modalDistrictSelect.dispatchEvent(new Event('change'));
                    
                    // Wait for schools to load then set school
                    setTimeout(() => {
                        modalSchoolSelect.value = grade.schoolId;
                    }, 500);

                } else if (DOM.userData.role === 'Inspetor') {
                    const modalSchoolSelect = DOM.modals.modalSchoolSelect;
                    modalSchoolSelect.value = grade.schoolId;
                }
                // Other roles don't need this as they use hidden fields

                // Show modal
                DOM.modals.grade.style.display = 'block';

                // Re-enable button after delay
                setTimeout(() => {
                    editButton.disabled = false;
                }, 1000);
                
            } catch (error) {
                console.error('Error editing grade:', error);
                UIHelpers.showToast('Erro ao carregar dados da turma', 'error');
                editButton.disabled = false;
            }
        }

        async function deleteGrade(gradeId) {
            try {
                // Prevent double click
                const deleteButton = event.currentTarget;
                deleteButton.disabled = true;

                // Store grade ID for deletion
                deleteGradeId = gradeId;

                // Show confirmation modal
                DOM.modals.delete.style.display = 'block';

                // Re-enable button after delay
                setTimeout(() => {
                    deleteButton.disabled = false;
                }, 1000);

            } catch (error) {
                console.error('Error in delete grade:', error);
                UIHelpers.showToast('Erro ao preparar exclusão da turma', 'error');
            }
        }

        // Make functions globally available
        window.editGrade = editGrade;
        window.deleteGrade = deleteGrade;

        // Initialize everything
        loadInitialData();
        initializeEventListeners();
    }
});

// Add this helper function at the beginning of the file
function debounceButton(button, delay = 1000) {
    if (!button) return;
    button.disabled = true;
    setTimeout(() => {
        button.disabled = false;
    }, delay);
}