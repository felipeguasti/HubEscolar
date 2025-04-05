const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const routes = require('./routes/users');
const db = require('./../config/db');
require('dotenv').config();

const app = express();
const port = process.env.USERS_SERVICE_PORT || 3001;

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Rotas
app.use('/users', routes);

// Conexão com o banco de dados
db.sync().then(() => {
    console.log('Banco de dados sincronizado.');
}).catch(err => {
    console.error('Erro ao sincronizar o banco de dados:', err);
});

// Middleware de erro
app.use((error, req, res, next) => {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
    next();
});

// Inicialização do servidor
app.listen(port, () => {
    console.log(`Serviço de usuários rodando na porta ${port}`);
});

module.exports = app;