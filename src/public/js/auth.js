// Variável para evitar múltiplos redirecionamentos
let hasRedirected = false;

/**
 * Verifica o estado de autenticação do usuário e atualiza a UI conforme necessário
 * @returns {Promise<boolean>} O estado de autenticação do usuário
 */
async function handleAuthCheck() {
    if (hasRedirected) {
        return false;
    }

    try {
        const response = await fetch('/auth/me', { redirect: 'manual' });

        let isAuthenticated = false;
        if (response.status === 200) {
            isAuthenticated = true;
            
            // Se estamos na página de login e o usuário já está autenticado, redirecione para o dashboard
            if (window.location.pathname === '/login') {
                hasRedirected = true;
                window.location.href = '/dashboard';
                return isAuthenticated;
            }
        } else if (response.status === 302 || response.status === 401) {
            isAuthenticated = false;
            
            // Se estamos em uma página protegida e o usuário não está autenticado, redirecione para o login
            const currentPath = window.location.pathname;
            const protectedPages = ['/dashboard', '/users', '/district', '/grade', '/features/settings'];
            const isLoginPage = currentPath === '/login';
            
            if (protectedPages.includes(currentPath) && !isLoginPage) {
                hasRedirected = true;
                window.location.href = '/login';
                return isAuthenticated;
            }
        } else {
            console.error('Erro ao verificar autenticação:', response.status, response.statusText);
        }

        // Atualiza a UI com base no estado de autenticação
        updateAuthUI(isAuthenticated);
        return isAuthenticated;

    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        updateAuthUI(false);
        return false;
    }
}

/**
 * Atualiza a interface baseado no estado de autenticação
 * @param {boolean} isAuthenticated - Se o usuário está autenticado
 */
function updateAuthUI(isAuthenticated) {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-btn');
    const dashboardButton = document.getElementById('login-button');

    if (!loginButton) console.warn('Botão de login não encontrado com ID: login-button');
    if (!logoutButton) console.warn('Botão de logout não encontrado com ID: logout-btn');
    if (!dashboardButton) console.warn('Botão de dashboard/login não encontrado com ID: login-button');

    if (loginButton && logoutButton && dashboardButton) {
        if (isAuthenticated) {
            loginButton.style.display = 'none';
            logoutButton.style.display = 'block';
            dashboardButton.style.display = 'block';
            dashboardButton.textContent = 'Dashboard';
            dashboardButton.href = '/dashboard';
            document.querySelectorAll('.authenticated-only').forEach(button => 
                button.style.display = 'block');
        } else {
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            dashboardButton.style.display = 'block';
            dashboardButton.textContent = 'Login';
            dashboardButton.href = '/login';
            document.querySelectorAll('.authenticated-only').forEach(button => 
                button.style.display = 'none');
        }
    }
}

/**
 * Função para realizar logout do usuário
 */
async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            // Limpar quaisquer dados de sessão no cliente
            sessionStorage.removeItem('userLoggedIn');
            window.location.href = '/login';
        } else {
            console.error('Erro ao fazer logout');
        }
    } catch (error) {
        console.error('Erro ao enviar requisição de logout:', error);
    }
}

// Adicionar listener de logout globalmente
document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Verificar autenticação em todas as páginas
    handleAuthCheck();
});

// Exportar funções para uso em outros módulos
window.handleAuthCheck = handleAuthCheck;
window.logout = logout;