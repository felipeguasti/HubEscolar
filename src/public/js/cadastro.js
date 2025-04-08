document.addEventListener('DOMContentLoaded', function() {
    const isCadastroPage = window.location.pathname.includes("cadastro");
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
  });