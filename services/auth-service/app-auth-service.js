import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import moment from 'moment-timezone';
import authRoutes from './src/routes/authRoutes.js';
import featureRoutes from './src/routes/featureRoutes.js';
import errorHandler from './src/middlewares/errorHandler.js';
import { Feature } from './src/models/Feature.js';
import { UserFeature } from './src/models/User_feature.js';

dotenv.config();

// Initialize associations
Feature.hasMany(UserFeature, {
    foreignKey: 'feature_id',
    as: 'userFeatures'
});

UserFeature.belongsTo(Feature, {
    foreignKey: 'feature_id',
    as: 'feature'
});

export const app = express();
const PORT = process.env.AUTH_SERVICE_URL ? new URL(process.env.AUTH_SERVICE_URL).port : 3004;

const targetTimezone = 'America/Sao_Paulo';
moment.tz.setDefault(targetTimezone);

// Middlewares básicos
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// Configuração do Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: (req) => {
        // Maior limite para usuários autenticados
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
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for Master users
    skip: (req) => req.user?.role === 'Master'
});

// Aplica o rate limiting APENAS às rotas de autenticação
app.use('/auth', limiter);

// Rotas
app.use('/features', featureRoutes);
app.use('/auth', authRoutes);

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicialização do servidor apenas se não estiver em teste
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Serviço de Autenticação rodando na porta ${PORT}`);
    });
}