const logoutButtonElement = document.getElementById('logout-btn');
if (logoutButtonElement) {
    logoutButtonElement.addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', function() {
    const isLoginPage = window.location.pathname.includes("login");

    if (isLoginPage) {
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