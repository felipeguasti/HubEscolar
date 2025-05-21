import express from 'express';
import dotenv from 'dotenv';
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

// Configuração do CORS primeiro
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para processamento do corpo das requisições
app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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