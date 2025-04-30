const logoutButtonElement = document.getElementById('logout-btn');
if (logoutButtonElement) {
    logoutButtonElement.addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', function() {
    const isLoginPage = window.location.pathname.includes("login");

    if (isLoginPage) {
        handleAuthCheck();
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
                        console.log('Falha no login:', data);
                        console.error('Erro no login:', data.message);
                        showPopup(`${data.message}: ${data.error}` || 'Erro ao processar o login. Tente novamente.');
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

});

let hasRedirected = false;

async function handleAuthCheck() {
    if (hasRedirected) {
        return;
    }

    try {
        const response = await fetch('/auth/me', { redirect: 'manual' }); // Impedir redirecionamento

        let isAuthenticated = false;
        if (response.status === 200) {
            isAuthenticated = true;
        } else if (response.status === 302) {
            isAuthenticated = false; // Usuário não autenticado, foi redirecionado
            const currentPath = window.location.pathname;
            const protectedPages = ['/dashboard', '/users', '/district', '/grade', '/features/settings'];
            const isLoginPage = currentPath === '/login';
            if (protectedPages.includes(currentPath) && !isLoginPage) {
                hasRedirected = true;
                window.location.href = '/login'; // <---- ESTE É O REDIRECIONAMENTO NO FRONT
            }
        } else if (response.status === 401) {
            // Lógica para 401 (não autorizado) se o servidor retornar isso
            isAuthenticated = false;
            const currentPath = window.location.pathname;
            const protectedPages = ['/dashboard', '/users', '/district', '/grade', '/features/settings'];
            const isLoginPage = currentPath === '/login';
            if (protectedPages.includes(currentPath) && !isLoginPage) {
                hasRedirected = true;
                window.location.href = '/login'; 
            }
        } else {
            console.error('Erro ao verificar autenticação:', response.status, response.statusText);
        }

        // Lógica para checkAuthAndUpdateButtons (mantém o restante da sua lógica)
        const loginButton = document.getElementById('login-button');
        const logoutButton = document.getElementById('logout-btn');
        const dashboardButton = document.getElementById('login-button');

        if (!loginButton) console.warn('Botão de login não encontrado com ID: login-button');
        if (!logoutButton) console.warn('Botão de logout não encontrado com ID: logout-btn');
        if (!dashboardButton) console.warn('Botão de dashboard/login não encontrado com ID: login-button');

        if (loginButton && logoutButton && dashboardButton) {
            if (isAuthenticated) {
                console.log('Usuário autenticado - mostrando Dashboard e Logout.');
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
                dashboardButton.style.display = 'block';
                dashboardButton.textContent = 'Dashboard';
                dashboardButton.href = '/dashboard';
                document.querySelectorAll('.authenticated-only').forEach(button => button.style.display = 'block');
            } else {
                console.log('Usuário não autenticado - mostrando Login.');
                loginButton.style.display = 'block';
                logoutButton.style.display = 'none';
                dashboardButton.style.display = 'block';
                dashboardButton.textContent = 'Login';
                dashboardButton.href = '/login';
                document.querySelectorAll('.authenticated-only').forEach(button => button.style.display = 'none');
            }
        }

    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        const loginButton = document.getElementById('login-button');
        const logoutButton = document.getElementById('logout-btn');
        const dashboardButton = document.getElementById('login-button');
        if (loginButton && logoutButton && dashboardButton) {
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            dashboardButton.style.display = 'block';
            dashboardButton.textContent = 'Login';
            dashboardButton.href = '/login';
            document.querySelectorAll('.authenticated-only').forEach(button => button.style.display = 'none');
        }
    }
}