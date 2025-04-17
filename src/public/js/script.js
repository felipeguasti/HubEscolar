const protectedPages = ['/dashboard', '/profile', '/settings', '/users', '/turmas', '/conteudos', '/reports', '/users'];
const currentPath = window.location.pathname;
const userRole = sessionStorage.getItem("user.role");
const logoutButton = document.getElementById('logout-btn');
const redirectToLogin = () => {
    window.location.href = '/login';
};

if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

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
// Função showPopup para usar com Promise (aceita texto simples e HTML)
function showPopup(message, callback) {
    const popup = document.getElementById("generic-popup");
    const messageContainer = popup.querySelector(".popup-message");
    const okButton = popup.querySelector(".popup-ok-button");

    // Verifica se a mensagem parece conter HTML
    const isHTML = /<[a-z][\s\S]*>/i.test(message);

    // Define a mensagem no popup usando textContent para texto simples e innerHTML para HTML
    if (isHTML) {
        messageContainer.innerHTML = message;
    } else {
        messageContainer.textContent = message;
    }

    // Exibe o popup
    popup.classList.remove("hidden");

    // Garante que o botão OK esteja visível
    okButton.style.display = "inline-block";

    // Adiciona o evento para fechar ao clicar fora
    const handleOutsideClick = (e) => {
        if (e.target === popup) {
            popup.classList.add("hidden");
            if (callback) callback();
            document.removeEventListener('click', handleOutsideClick);
        }
    };

    document.addEventListener('click', handleOutsideClick);

    // Retorna uma Promise para aguardar o clique do usuário
    return new Promise((resolve) => {
        // Adiciona o evento de clique no botão OK para fechar o popup
        okButton.onclick = () => {
            popup.classList.add("hidden");
            document.removeEventListener('click', handleOutsideClick);
            resolve();
            if (callback) callback();
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

async function logout() {
    try {
        // Faz uma requisição POST para a rota de logout no backend
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Logout bem-sucedido:', data.message);

            // Limpa quaisquer dados de sessão do frontend
            sessionStorage.removeItem('userLoggedIn');
            sessionStorage.removeItem('popupShown');

            // Redireciona para a URL fornecida na resposta
            if (data.redirectTo) {
                window.location.href = data.redirectTo;
            } else {
                // Se por algum motivo não houver redirectTo, redirecione para um padrão
                window.location.href = '/login';
            }
        } else {
            console.error('Erro ao fazer logout:', response.status, response.statusText);
            // Lide com erros de logout aqui
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}