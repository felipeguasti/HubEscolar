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
require('dotenv').config();
const moment = require('moment-timezone'); // Adicione esta linha

console.log('[HubEscolar - app.js] Inicializando...');

// Configuração do fuso horário
process.env.TZ = 'America/Sao_Paulo'; // Define a variável de ambiente TZ
moment.tz.setDefault('America/Sao_Paulo'); // Define o fuso horário padrão do moment-timezone
console.log('[HubEscolar - app.js] Fuso horário configurado para America/Sao_Paulo.');

// Importação de módulos
const adminsRoutes = require('./src/routes/admins');
const classesRoute = require('./src/routes/classes');
const authRoutes = require('./src/routes/authRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const districtsRoutes = require('./src/routes/districtsRoutes');
const schoolsRoutes = require('./src/routes/schoolRoutes');
const gradeRoutes = require('./src/routes/gradesRoutes');
const dashboardRoutes = require('./src/routes/dashboard');
const reportRoutes = require('./src/routes/reportRoutes');
console.log('[HubEscolar - app.js] Módulos de rotas importados.');

// Validação das variáveis de ambiente
if (!process.env.SESSION_SECRET || !process.env.JWT_SECRET || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[HubEscolar - app.js] Erro: Configurações de ambiente ausentes. Verifique o arquivo .env.');
    throw new Error('Configurações de ambiente ausentes. Verifique o arquivo .env.');
}
console.log('[HubEscolar - app.js] Variáveis de ambiente validadas.');

// Middleware para análise de corpo de requisição
app.use(express.json());
console.log('[HubEscolar - app.js] Middleware express.json() carregado.');
app.use(express.urlencoded({ extended: true }));
console.log('[HubEscolar - app.js] Middleware express.urlencoded() carregado.');
app.use(express.static('./src/public'));
console.log('[HubEscolar - app.js] Middleware express.static() para arquivos públicos carregado.');
app.use(expressLayouts);
console.log('[HubEscolar - app.js] Middleware expressLayouts carregado.');
app.set('layout', 'partials/main-layout');
console.log('[HubEscolar - app.js] Layout padrão definido.');

app.use(cookieParser());
console.log('[HubEscolar - app.js] Middleware cookieParser carregado.');

// Configuração do session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret', // Coloque uma chave secreta
    resave: false,
    saveUninitialized: true
}));
console.log('[HubEscolar - app.js] Middleware de sessão configurado.');

app.use(passport.initialize());
console.log('[HubEscolar - app.js] Passport inicializado.');
app.use(passport.session());
console.log('[HubEscolar - app.js] Passport session configurado.');

// Configuração do flash middleware
app.use(flash());
console.log('[HubEscolar - app.js] Middleware flash carregado.');

// Servir arquivos estáticos (redundante, já feito acima)
// app.use(express.static(path.join(__dirname, 'src', 'public')));

// Configuração do motor de visualização e layouts
app.set('view engine', 'ejs');
console.log('[HubEscolar - app.js] View engine configurado para EJS.');
app.set('views', path.join(__dirname, 'src', 'views'));
console.log('[HubEscolar - app.js] Diretório de views definido.');
// app.use(expressLayouts); // Já carregado acima
// app.set('layout', 'partials/main-layout'); // Já definido acima

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
console.log('[HubEscolar - app.js] Configuração do Multer realizada.');

// Configuração de rotas
app.use('/admin', adminsRoutes);
console.log('[HubEscolar - app.js] Rotas de admin carregadas.');
app.use('/auth', authRoutes);
console.log('[HubEscolar - app.js] Rotas de autenticação carregadas.');
app.use('/users', usersRoutes);
console.log('[HubEscolar - app.js] Rotas de usuários carregadas.');
app.use('/districts', districtsRoutes);
console.log('[HubEscolar - app.js] Rotas de distritos carregadas.');
app.use('/schools', schoolsRoutes);
console.log('[HubEscolar - app.js] Rotas de escolas carregadas.');
app.use('/grades', gradeRoutes);
console.log('[HubEscolar - app.js] Rotas de escolas carregadas.');
app.use('/classes', classesRoute);
console.log('[HubEscolar - app.js] Rotas de classes carregadas.');
app.use('/dashboard', dashboardRoutes);
console.log('[HubEscolar - app.js] Rotas de dashboard carregadas.');
app.use('/reports', reportRoutes);
console.log('[HubEscolar - app.js] Rotas de relatórios carregadas.');




// Rota inicial
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Início'
    });
    console.log('[HubEscolar - app.js] Rota GET / carregada.');
});

// Rota de login (renderiza a página de login localmente)
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login',
        message: req.flash('message')
    });
    console.log('[HubEscolar - app.js] Rota GET /login carregada.');
});

// Outras rotas de página (que são renderizadas localmente pelo sistema principal)
app.get('/recursos', (req, res) => {
    res.render('recursos', { title: 'Recursos' });
    console.log('[HubEscolar - app.js] Rota GET /recursos carregada.');
});

app.get('/planos', (req, res) => {
    res.render('planos', { title: 'Planos' });
    console.log('[HubEscolar - app.js] Rota GET /planos carregada.');
});

app.get('/blog', (req, res) => {
    res.render('blog', { title: 'Blog' });
    console.log('[HubEscolar - app.js] Rota GET /blog carregada.');
});

app.get('/sobre', (req, res) => {
    res.render('sobre', { title: 'Sobre' });
    console.log('[HubEscolar - app.js] Rota GET /sobre carregada.');
});

app.get('/contato', (req, res) => {
    res.render('contato', { title: 'Contato' });
    console.log('[HubEscolar - app.js] Rota GET /contato carregada.');
});

// Rota de esqueci minha senha (renderiza a página localmente)
app.get('/forgot-password', (req, res) => {
    res.render('forgot', { title: 'Esqueceu a senha', message: req.flash('message') });
    console.log('[HubEscolar - app.js] Rota GET /forgot-password carregada.');
});

app.get('/reports', (req, res) => {
    const reports = req.query.reports || [];
    res.render('reports', { reports });
    console.log('[HubEscolar - app.js] Rota GET /reports carregada.');
});

app.get('/warnings', (req, res) => {
    res.render('warnings');
    console.log('[HubEscolar - app.js] Rota GET /warnings carregada.');
});

// Página de redefinição de senha (renderiza a página localmente)
app.get('/reset-password/:token', (req, res) => {
    res.render('reset-password', { title: 'Redefinir Senha', token: req.params.token });
    console.log('[HubEscolar - app.js] Rota GET /reset-password/:token carregada.');
});

// Configuração para servir arquivos estáticos na pasta 'js'
app.use('/js', express.static(path.join(__dirname, 'src', 'public', 'js')));
console.log('[HubEscolar - app.js] Middleware para servir arquivos estáticos em /js carregado.');

// Middleware para registrar requisições
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[HubEscolar - app.js] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    });
    next();
});
console.log('[HubEscolar - app.js] Middleware de registro de requisições carregado.');

// Middleware de erro
app.use((error, req, res, next) => {
    console.error('[HubEscolar - app.js] Erro:', error);

    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Erro de upload de arquivo.' });
    }

    res.status(500).json({ error: 'Erro interno do servidor.' });
    next();
});
console.log('[HubEscolar - app.js] Middleware de tratamento de erros carregado.');

// Inicializando o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[HubEscolar - app.js] Servidor rodando na porta ${PORT}`);
});

// Exportando o aplicativo
module.exports = app;