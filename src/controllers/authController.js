// Exemplo de um controlador no seu backend (hubescolar)
const authService = require('./authService'); // Assumindo que seu authService.js está aqui

exports.loginHandler = async (req, res) => {
    const { email, password } = req.body;

    try {
        const authServiceResponse = await authService.login(email, password);

        if (authServiceResponse && authServiceResponse.accessToken && authServiceResponse.refreshToken) {
            // Formate a resposta para o frontend
            return res.json({
                message: 'Login bem-sucedido',
                token: authServiceResponse.accessToken, // Envie o accessToken como 'token'
                refreshToken: authServiceResponse.refreshToken, // Você pode enviar o refreshToken também
                expiresAt: new Date(Date.now() + (3600 * 1000 * 24)), //Lógica para calcular a expiração do accessToken (24 horas)
                redirectTo: '/dashboard'
            });
        } else {
            return res.status(401).json({ message: 'Falha na autenticação.' });
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro ao processar o login.' });
    }
};