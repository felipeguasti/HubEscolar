const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const errorHandler = require('./src/middlewares/errorHandler');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.AUTH_SERVICE_URL ? new URL(process.env.AUTH_SERVICE_URL).port : 3004;

// Configuração do Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: 'Muitas tentativas de acesso. Por favor, tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false, 
});

// Aplica o rate limiting APENAS às rotas de autenticação
app.use('/auth', limiter);

// Middlewares básicos
app.use(bodyParser.json());
app.use(cors());

// Rotas de autenticação
app.use('/auth', authRoutes);

// Middleware de tratamento de erros (deve ser o último middleware)
app.use(errorHandler);

// Inicialização do servidor (sem conexão com banco de dados local)
app.listen(PORT, () => {
    console.log(`Serviço de Autenticação rodando na porta ${PORT}`);
});