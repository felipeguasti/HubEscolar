const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const passport = require('./src/config/passport');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const authMiddleware = require('./src/middlewares/auth');
require('dotenv').config();

// Importação de módulos
const studentsRoutes = require('./src/modules/manager/routes/students');
const teachersRoutes = require('./src/modules/manager/routes/teachers');
const coordenatorsRoutes = require('./src/modules/manager/routes/coordenators');
const adminsRoutes = require('./src/routes/admins'); 
const reportsRoutes = require('./src/modules/manager/routes/reports');
const warningsRoutes = require('./src/modules/manager/routes/warnings');
const db = require('./src/config/db');
const classesRoute = require('./src/modules/manager/routes/classes');
const broadcastRoutes = require('./src/modules/broadcast/routes/broadcasts');
const EduControlRoutes = require('./src/modules/EduControl/routes/reservations');
const managerRoutes = require('./src/modules/manager/routes/manager');
const authRoutes = require('./src/modules/auth/routes/authRoutes');
const dashboardRoutes = require('./src/modules/manager/routes/dashboard')
const usersRoutes = require('./src/routes/users')
const usersDistricts = require('./src/routes/districts')
const schoolsRoutes = require('./src/routes/schools')
const gradesRoutes = require('./src/routes/grades')

// Validação das variáveis de ambiente
if (!process.env.SESSION_SECRET || !process.env.JWT_SECRET || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Configurações de ambiente ausentes. Verifique o arquivo .env.');
}


// Middleware para análise de corpo de requisição
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./src/public'));
app.use(expressLayouts); 
app.set('layout', 'partials/main-layout'); 

app.use(cookieParser());

// Configuração do session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret', // Coloque uma chave secreta
  resave: false,
  saveUninitialized: true
}));


app.use(passport.initialize());
app.use(passport.session());

// Configuração do flash middleware
app.use(flash());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Configuração do motor de visualização e layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressLayouts); // Ativando o uso de layouts
app.set('layout', 'partials/main-layout'); // Definindo o layout padrão

// Configuração do Multer
const upload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'src', 'public', 'medias', 'uploads'));
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Tipo de arquivo não permitido.'));
        }
        cb(null, true);
    }
});

// Configuração de rotas
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/educontrol', EduControlRoutes);
app.use('/api/manager', managerRoutes);
app.use('/students', studentsRoutes);
app.use('/teachers', teachersRoutes);
app.use('/coordenators', coordenatorsRoutes);
app.use('/admin', adminsRoutes);
app.use('/reports', reportsRoutes);
app.use('/warnings', warningsRoutes);
app.use('/auth', authRoutes);
app.use('/classes', classesRoute);
app.use('/dashboard', dashboardRoutes);
app.use('/users', usersRoutes);
app.use('/districts', usersDistricts);
app.use('/schools', schoolsRoutes);
app.use('/grades', gradesRoutes);

// Rota inicial
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Início'
    });
});

// Rota de login
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login',
        message: req.flash('message') // Adicionando a mensagem flash ao renderizar a página
    });
});

// Outras rotas de página
app.get('/recursos', (req, res) => {
    res.render('recursos', {
        title: 'Recursos'
    });
});

app.get('/planos', (req, res) => {
    res.render('planos', {
        title: 'Planos'
    });
});

app.get('/blog', (req, res) => {
    res.render('blog', {
        title: 'Blog'
    });
});

app.get('/sobre', (req, res) => {
    res.render('sobre', {
        title: 'Sobre'
    });
});

app.get('/contato', (req, res) => {
    res.render('contato', {
        title: 'Contato'
    });
});

// Rota de esqueci minha senha
app.get('/forgot-password', (req, res) => {
    res.render('forgot', {
        title: 'Esqueceu a senha',
        message: req.flash('message'), // Mensagens enviadas pelo controlador
    });
});

app.get('/reports', (req, res) => {
    const reports = req.query.reports || [];
    res.render('reports', { reports });
});

app.get('/warnings', (req, res) => {
    res.render('warnings');
});


// Página de redefinição de senha (usada após o link enviado)
app.get('/reset-password/:token', (req, res) => {
    res.render('reset-password', {
        title: 'Redefinir Senha',
        token: req.params.token // Inclui o token no contexto da página
    });
});

// Configuração para servir arquivos estáticos na pasta 'js'
app.use('/js', express.static(path.join(__dirname, 'src', 'public', 'js')));

// Middleware para registrar requisições
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    });
    next();
});


// Middleware de erro
app.use((error, req, res, next) => {
    console.error('Erro:', error);

    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Erro de upload de arquivo.' });
    }

    res.status(500).json({ error: 'Erro interno do servidor.' });
    next();
});


// Inicializando o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Exportando o aplicativo
module.exports = app;
