const logoutButtonElement = document.getElementById('logout-btn');
if (logoutButtonElement) {
    logoutButtonElement.addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', function() {
    const isLoginPage = window.location.pathname.includes("login");
    checkAuthAndUpdateButtons()

    if (isLoginPage) {
        redirectToDashboardIfAuthenticated()

        const loginForm = document.getElementById("login-form");
        const submitBtn = document.getElementById("submit-btn");
        const messageEl = document.getElementById("message");
    
        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);

            function getCookie(name) {
                const nameEQ = name + "=";
                const ca = document.cookie.split(';');
                for(let i = 0; i < ca.length; i++) {
                  let c = ca[i];
                  while (c.charAt(0) === ' ') {
                    c = c.substring(1, c.length);
                  }
                  if (c.indexOf(nameEQ) === 0) {
                    const value = c.substring(nameEQ.length, c.length);
                    return value;
                  } else {
                  }
                }
                return null;
            }
    
            async function handleLogin(event) {
                event.preventDefault();
            
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value.trim();
                const messageEl = document.getElementById('message');
                const submitBtn = document.getElementById('submit-btn');
            
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
            
                    if (response.ok) {
                        // Login bem-sucedido!
                        if (data.redirectTo) {
                            sessionStorage.setItem('userLoggedIn', 'true'); // Opcional: manter um indicador de login no sessionStorage
                            window.location.href = data.redirectTo; // Redireciona para a URL fornecida pelo backend
                        } else {
                            console.warn('Login bem-sucedido, mas nenhuma URL de redirecionamento fornecida pelo backend.');
                            // Você pode definir um redirecionamento padrão no frontend aqui, se necessário
                            window.location.href = '/dashboard'; // Redirecionamento padrão (opcional)
                        }
                    } else {
                        // Falha no login
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

        async function redirectToDashboardIfAuthenticated() {
            try {
                const response = await fetch('/auth/me');
        
                if (response.ok) {
                    const currentPath = window.location.pathname;
                    const isDashboardPage = currentPath === '/dashboard';
        
                    if (!isDashboardPage) {
                        window.location.href = '/dashboard';
                    }
                } else if (response.status === 401) {
                    // Não fazer nada se a resposta for 401 (Não Autorizado)
                    // Isso significa que o usuário não está logado, o que é esperado na página de login.
                    console.log('Usuário não autenticado (401) - permanecendo na página de login.');
                } else {
                    // Logar outros erros que não sejam 401
                    console.error('Erro ao verificar autenticação:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Erro ao verificar autenticação (rede ou outros):', error);
            }
        }        
    }  

});

async function checkAuthAndUpdateButtons() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-btn');
    const dashboardButton = document.getElementById('login-button'); // Usamos o mesmo botão para Login/Dashboard

    if (!loginButton) {
        console.warn('Botão de login não encontrado com ID: login-button');
        return;
    }
    if (!logoutButton) {
        console.warn('Botão de logout não encontrado com ID: logout-btn');
        return;
    }

    try {
        const response = await fetch('/auth/me');

        if (response.ok) {
            console.log('Usuário autenticado - mostrando Dashboard e Logout.');
            loginButton.style.display = 'none'; // Oculta o link de "Login"
            logoutButton.style.display = 'block';
            dashboardButton.style.display = 'block'; // Garante que o link apareça como "Dashboard"
            dashboardButton.textContent = 'Dashboard';
            dashboardButton.href = '/dashboard';

            // Se você tiver outros botões/elementos autenticados
            const otherAuthenticatedButtons = document.querySelectorAll('.authenticated-only');
            otherAuthenticatedButtons.forEach(button => {
                button.style.display = 'block';
            });

        } else {
            console.log('Usuário não autenticado - mostrando Login.');
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            dashboardButton.style.display = 'block'; // Garante que o link apareça como "Login" inicialmente
            dashboardButton.textContent = 'Login';
            dashboardButton.href = '/login';

            // Esconde outros botões/elementos autenticados
            const otherAuthenticatedButtons = document.querySelectorAll('.authenticated-only');
            otherAuthenticatedButtons.forEach(button => {
                button.style.display = 'none';
            });

            const currentPath = window.location.pathname;
            const isLoginPage = currentPath === '/login';
            const protectedPages = ['/dashboard', '/outra-pagina-protegida'];

            if (protectedPages.includes(currentPath) && !isLoginPage) {
                window.location.href = '/login';
            }
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação para botões:', error);
        // Em caso de erro, mostre apenas o botão de login como padrão
        loginButton.style.display = 'block';
        logoutButton.style.display = 'none';
        dashboardButton.style.display = 'block';
        dashboardButton.textContent = 'Login';
        dashboardButton.href = '/login';
        const otherAuthenticatedButtons = document.querySelectorAll('.authenticated-only');
        otherAuthenticatedButtons.forEach(button => {
            button.style.display = 'none';
        });
    }
}