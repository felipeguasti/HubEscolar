// app-school-service.js
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();
const port = process.env.SCHOOL_SERVICE_PORT || 3002;
const authMiddleware = require('./src/middlewares/auth');
const morgan = require('morgan');
const logger = require('./src/services/loggingService');
const { handleServiceError } = require('./src/services/errorHandlingService');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const schoolRoutes = require('./src/routes/schools');
const gradesRoutes = require('./src/routes/grades');
const subjectsRoutes = require('./src/routes/subjects');
const sequelize = require('./src/config/db'); // Importe a instância do Sequelize de db.js

// Middleware para analisar o corpo das requisições com limite de tamanho
app.use(bodyParser.json({ limit: '100kb' })); // Limita o tamanho do corpo JSON para 100KB
// Se você estiver usando urlencoded também, adicione o limite aqui:
// app.use(bodyParser.urlencoded({ extended: true, limit: '100kb' }));

// Use o helmet para segurança dos headers HTTP
app.use(helmet());

// Stream para o Winston
const logStream = {
    write: message => logger.http(message.trim()),
};

// Middleware de logging HTTP com Morgan
app.use(morgan('combined', { stream: logStream }));

app.use(authMiddleware);

// Configuração do rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: (req) => {
        logger.debug(`Rate limit check - User: ${req.user?.id}, Role: ${req.user?.role}`);
        
        if (req.user) {
            return 1000; // 1000 requisições para usuários logados
        }
        return 100; // 100 requisições para não autenticados
    },
    message: (req) => ({
        error: req.user 
            ? 'Limite de requisições excedido para usuário autenticado' 
            : 'Muitas requisições deste IP, por favor tente novamente mais tarde'
    }),
    standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
    legacyHeaders: false, // Não retorna os headers `X-RateLimit-*` legados
    skip: (req) => {
        // Adiciona log para debug do skip
        logger.debug(`Skip check - User Role: ${req.user?.role}`);
        return req.user?.role === 'Master' || req.user?.role === 'Diretor';
    }
});

// Monta as rotas sob o prefixo /schools
app.use('/schools', limiter, schoolRoutes);
app.use('/grades', limiter, gradesRoutes);
app.use('/subjects', limiter, subjectsRoutes);


// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
    logger.error('Erro não tratado:', err.stack);
    return handleServiceError(res, err); // Utilize seu serviço de tratamento de erros
});

app.listen(port, () => {
    console.log(`Serviço de escolas rodando na porta ${port}`);
});

module.exports = app;