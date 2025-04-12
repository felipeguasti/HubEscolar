const User = require('../models/User');
const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
    ],
});

async function getFetch() {
    try {
        const fetchModule = await import('node-fetch');
        return fetchModule.default;
    } catch (error) {
        console.error('Erro ao importar node-fetch:', error);
        return null;
    }
}

let fetch;
getFetch().then(f => {
    fetch = f;
});
const { body, validationResult } = require('express-validator');
const { emailExiste, invalidarCache } = require('../services/userCacheService');
const logService = require('../services/logService');
require('dotenv').config();
const {
    verificarPermissaoCriacao,
    verificarPermissaoEdicao,
    verificarPermissaoExclusao
} = require('../services/permissionService');
const {
    applyUserFilters,
    validarCPF,
    validarTelefone,
    validarDataNascimento,
    validarCEP
} = require('../services/userService');

const tentativasCriacao = new Map();
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO = 15 * 60 * 1000;

// Função auxiliar para fazer fetch com autorização
async function fetchDataWithAuth(url, method = 'GET', body = null, accessToken) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
    };
    const config = { method, headers };
    if (body) {
        config.body = JSON.stringify(body);
    }
    const response = await fetch(url, config);
    return response;
}

exports.buscarUsuarioPorEmail = async (req, res) => {
    const { email } = req.params;
    try {
        const user = await User.findOne({ where: { email } });
        if (user) {
            logger.info(`Usuário encontrado com o email: ${email}`, { service: 'users-service' });
            res.json(user);
        } else {
            logger.warn(`Usuário com o email ${email} não encontrado.`, { service: 'users-service' });
            res.status(404).json({ message: 'Usuário não encontrado.' });
        }
    } catch (error) {
        logger.error('Erro ao buscar usuário por email:', error, { service: 'users-service' });
        res.status(500).json({ message: 'Erro ao buscar usuário.' });
    }
};

const verificarTentativas = (ip) => {
    const agora = Date.now();
    const tentativas = tentativasCriacao.get(ip) || { contador: 0, ultimaTentativa: 0 };
    if (agora - tentativas.ultimaTentativa > TEMPO_BLOQUEIO) {
        tentativas.contador = 0;
    }
    tentativas.contador++;
    tentativas.ultimaTentativa = agora;
    tentativasCriacao.set(ip, tentativas);
    if (tentativas.contador > MAX_TENTATIVAS) {
        const tempoRestante = Math.ceil((TEMPO_BLOQUEIO - (agora - tentativas.ultimaTentativa)) / 1000 / 60);
        return { bloqueado: true, tempoRestante };
    }
    return { bloqueado: false };
};

exports.adicionarUsuario = [
    // Validações (mantidas)
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
    body('role').notEmpty().withMessage('Papel é obrigatório'),
    body('cpf').optional().custom(validarCPF),
    body('phone').optional().custom(validarTelefone),
    body('dateOfBirth').optional().custom(validarDataNascimento),
    body('gender').optional().isIn(['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer']).withMessage('Gênero inválido'),
    body('schoolId').optional(),
    body('districtId').optional(),
    body('address').optional(),
    body('city').optional(),
    body('state').optional(),
    body('zip').optional().custom(validarCEP).customSanitizer(value => value ? value.replace(/[^\d]/g, '').padStart(8, '0') : value),
    body('horario').optional().default('Integral').isIn(['Manhã', 'Tarde', 'Noite', 'Integral']).withMessage('Horário inválido'),
    body('userClass').optional(),
    body('content').optional(),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status inválido'),

    async (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        const verificação = verificarTentativas(ip);
        if (verificação.bloqueado) {
            return res.status(429).json({ message: `Muitas tentativas de criação. Tente novamente em ${verificação.tempoRestante} minutos.` });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { email } = req.body;
            if (await emailExiste(email)) {
                return res.status(400).json({ message: 'Usuário já existe.' });
            }

            if (!req.user || !req.user.id) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            const usuarioLogado = await User.findByPk(req.user.id, { attributes: ['id', 'role', 'districtId'] });
            if (!usuarioLogado) {
                return res.status(401).json({ message: 'Usuário não encontrado.' });
            }

            const { role: novoRole } = req.body;
            const verificacaoPermissao = verificarPermissaoCriacao(usuarioLogado.role, novoRole);
            if (!verificacaoPermissao.permitido) {
                return res.status(403).json({ message: verificacaoPermissao.mensagem });
            }

            const {
                name,
                email: novoEmail,
                password,
                cpf,
                phone,
                dateOfBirth,
                gender,
                role,
                horario,
                userClass,
                content,
                address,
                city,
                state,
                zip,
                status,
                schoolId,
                districtId: formDistrictId
            } = req.body;

            const usuarioExistente = await User.findOne({ where: { email: novoEmail } });
            if (usuarioExistente) {
                return res.status(400).json({ message: 'Usuário já existe.' });
            }

            const defaultPassword = process.env.DEFAULT_PASSWORD;
            let finalDistrictId = formDistrictId;
            if (usuarioLogado.role !== 'Master') {
                finalDistrictId = usuarioLogado.districtId;
            }
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

            if (schoolId) {
                const schoolServiceUrl = `<span class="math-inline">\{process\.env\.SCHOOL\_SERVICE\_URL\}/schools/</span>{schoolId}`;
                const schoolResponse = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
                if (!schoolResponse.ok) {
                    return res.status(400).json({ message: 'schoolId inválido.' });
                }
            }

            if (finalDistrictId) {
                const districtServiceUrl = `<span class="math-inline">\{process\.env\.DISTRICT\_SERVICE\_URL\}/districts/</span>{finalDistrictId}`;
                const districtResponse = await fetchDataWithAuth(districtServiceUrl, 'GET', null, accessToken);
                if (!districtResponse.ok) {
                    return res.status(400).json({ message: 'districtId inválido.' });
                }
            }

            const newUser = await User.create({
                name,
                email: novoEmail,
                password: defaultPassword,
                cpf,
                phone,
                dateOfBirth,
                gender,
                role,
                horario,
                userClass,
                content,
                address,
                city,
                state,
                zip,
                status,
                schoolId,
                districtId: finalDistrictId
            });

            invalidarCache();
            await logService.logUserOperation('criacao', newUser.id, { criadoPor: usuarioLogado.id, role: newUser.role });
            res.status(201).json({ message: 'Usuário criado com sucesso.' });

        } catch (error) {
            console.error(error);
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ message: 'Erro de validação', errors: error.errors });
            }
            if (error.message === 'Senha padrão não definida no .env') {
                return res.status(500).json({ message: 'Senha padrão não definida no arquivo .env' });
            }
            await logService.error('Erro ao criar usuário', { error: error.message });
            res.status(500).json({ message: 'Erro ao criar usuário.' });
        }
    }
];

exports.listarUsuarios = async (req, res) => {
    try {
        const usuarios = await User.findAll();
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        await logService.error('Erro ao listar usuários', { error: error.message });
        res.status(500).json({ message: 'Erro ao listar usuários.' });
    }
};

exports.atualizarUsuario = [
    // Validações (mantidas)
    body('name').optional().notEmpty().withMessage('Nome é obrigatório'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('role').optional().notEmpty().withMessage('Papel é obrigatório'),
    body('cpf').optional().custom(validarCPF),
    body('phone').optional().custom(validarTelefone),
    body('dateOfBirth').optional().custom(validarDataNascimento),
    body('gender').optional().isIn(['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer']).withMessage('Gênero inválido'),
    body('schoolId').optional(),
    body('districtId').optional(),
    body('address').optional(),
    body('city').optional(),
    body('state').optional(),
    body('zip').optional().custom(validarCEP).optional().customSanitizer(value => value ? value.replace(/[^\d]/g, '').padStart(8, '0') : value),
    body('horario').optional().isIn(['Manhã', 'Tarde', 'Noite', 'Integral']).withMessage('Horário inválido'),
    body('userClass').optional(),
    body('content').optional(),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status inválido'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { id } = req.params;
            const dadosRecebidos = req.body;
            const usuarioLogado = req.user;

            if (!usuarioLogado) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            const usuarioAlvo = await User.findByPk(id);
            if (!usuarioAlvo) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }

            const verificacaoPermissao = verificarPermissaoEdicao(
                usuarioLogado.role,
                usuarioAlvo.role,
                usuarioLogado.id,
                usuarioAlvo.id
            );
            if (!verificacaoPermissao.permitido) {
                return res.status(403).json({ message: verificacaoPermissao.mensagem });
            }

            const updatedData = {};
            Object.keys(dadosRecebidos).forEach((campo) => {
                if (dadosRecebidos[campo] !== undefined && dadosRecebidos[campo] !== '') {
                    updatedData[campo] = dadosRecebidos[campo];
                }
            });

            if (Object.keys(updatedData).length === 0) {
                return res.status(400).json({ message: 'Nenhum dado válido para atualizar.' });
            }

            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

            if (updatedData.schoolId) {
                const schoolServiceUrl = `<span class="math-inline">\{process\.env\.SCHOOL\_SERVICE\_URL\}/schools/</span>{updatedData.schoolId}`;
                const schoolResponse = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
                if (!schoolResponse.ok) {
                    return res.status(400).json({ message: 'schoolId inválido.' });
                }
            }

            if (updatedData.districtId) {
                const districtServiceUrl = `<span class="math-inline">\{process\.env\.DISTRICT\_SERVICE\_URL\}/districts/</span>{updatedData.districtId}`;
                const districtResponse = await fetchDataWithAuth(districtServiceUrl, 'GET', null, accessToken);
                if (!districtResponse.ok) {
                    return res.status(400).json({ message: 'districtId inválido.' });
                }
            }

            await User.update(updatedData, { where: { id } });
            const usuarioAtualizado = await User.findByPk(id);
            const usuarioResponse = {
                id: usuarioAtualizado.id,
                nome: usuarioAtualizado.name,
                email: usuarioAtualizado.email,
                role: usuarioAtualizado.role,
                status: usuarioAtualizado.status,
                horario: usuarioAtualizado.horario,
                address: usuarioAtualizado.address,
                city: usuarioAtualizado.city,
                state: usuarioAtualizado.state,
                zip: usuarioAtualizado.zip,
                cpf: usuarioAtualizado.cpf,
                phone: usuarioAtualizado.phone,
                dateOfBirth: usuarioAtualizado.dateOfBirth,
                gender: usuarioAtualizado.gender,
                profilePic: usuarioAtualizado.profilePic,
                content: usuarioAtualizado.content,
                userClass: usuarioAtualizado.userClass,
                schoolId: usuarioAtualizado.schoolId,
                districtId: usuarioAtualizado.districtId,
                updatedAt: usuarioAtualizado.updatedAt
            };

            await logService.logUserOperation('edicao', id, { editadoPor: usuarioLogado.id, alteracoes: updatedData });
            res.status(200).json(usuarioResponse);

        } catch (error) {
            console.error('Erro ao atualizar o usuário:', error);
            await logService.error('Erro ao atualizar usuário', { error: error.message, id: req.params.id });
            res.status(500).json({ message: 'Erro ao atualizar o usuário.' });
        }
    }
];

exports.deletarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }
        const usuarioLogado = req.user;
        if (!usuarioLogado) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }
        const usuarioAlvo = await User.findByPk(id);
        if (!usuarioAlvo) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const permissaoExclusao = verificarPermissaoExclusao(usuarioLogado.role, usuarioAlvo.role);
        if (!permissaoExclusao.permitido) {
            return res.status(403).json({ message: permissaoExclusao.mensagem });
        }
        await User.destroy({ where: { id } });
        res.json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir o usuário:', error);
        await logService.error('Erro ao excluir usuário', { error: error.message, id: req.params.id });
        res.status(500).json({ message: error.message });
    }
};

exports.buscarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await User.findByPk(id, {
            attributes: { exclude: ['password'] },
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        let school = null;
        let district = null;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Não buscar schoolId ou districtId para usuários Master
        if (usuario.role !== 'Master') {
            if (usuario.schoolId && usuario.role !== 'Inspector') {
                const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${usuario.schoolId}`;
                const schoolResponse = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
                if (schoolResponse.ok) {
                    school = await schoolResponse.json();
                } else {
                    console.error('Erro ao buscar escola do school-service:', schoolResponse.statusText);
                }
            }

            if (usuario.districtId) {
                const districtServiceUrl = `${process.env.DISTRICT_SERVICE_URL}/districts/${usuario.districtId}`;
                const districtResponse = await fetchDataWithAuth(districtServiceUrl, 'GET', null, accessToken);
                if (districtResponse.ok) {
                    district = await districtResponse.json();
                } else {
                    console.error('Erro ao buscar distrito do district-service:', districtResponse.statusText);
                }
            }
        }

        res.json({ ...usuario.toJSON(), school, district });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.buscarUsuarioLogado = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }

        const usuario = req.user;

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        let school = null;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Não buscar schoolId para usuários Master ou Inspetor
        if (usuario.role !== 'Master' && usuario.role !== 'Inspector' && usuario.schoolId) {
            const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${usuario.schoolId}`;
            const schoolResponse = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
            if (schoolResponse.ok) {
                school = await schoolResponse.json();
            } else {
                console.error('Erro ao buscar escola do school-service:', schoolResponse.statusText);
            }
        }

        res.json({ ...usuario.toJSON(), school });

    } catch (error) {
        console.error('Erro ao buscar usuário logado:', error);
        res.status(500).json({ message: 'Erro ao buscar usuário logado.' });
    }
};

exports.resetarSenha = async (req, res) => {
    try {
        const { id } = req.body;
        const usuario = await User.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const defaultPassword = process.env.DEFAULT_PASSWORD;

        if (!defaultPassword) {
            return res.status(500).json({ message: 'Senha padrão não configurada.' });
        }

        usuario.senha = defaultPassword;
        await usuario.save();

        res.status(200).json({
            message: 'Senha resetada com sucesso!',
            novaSenha: defaultPassword
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao resetar a senha.' });
    }
};

exports.filterUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const user = await User.findByPk(req.user.id);
        const whereClause = applyUserFilters(user, req.query);

        const users = await User.findAll({ where: whereClause });

        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        let schools = [];
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        if (req.query.districtId) {
            const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/list?districtId=${req.query.districtId}`;
            const response = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
            if (response.ok) {
                schools = await response.json();
            } else {
                console.error('Erro ao buscar escolas do school-service:', response.statusText);
            }
        }

        res.json({
            users: sortedUsers,
            schools
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).json({ error: 'Erro ao carregar os usuários' });
    }
};

exports.getUsersData = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const districts = await District.findAll();
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Buscar escolas do microsserviço school-service
        const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools`;
        const schoolResponse = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
        let schools = [];
        if (schoolResponse.ok) {
            schools = await schoolResponse.json();
        } else {
            console.error('Erro ao buscar escolas do school-service:', schoolResponse.statusText);
        }

        const grades = await Grade.findAll();
        let whereClause = {};

        if (user.role !== 'Master') {
            whereClause.districtId = user.districtId;
            if (user.schoolId !== undefined) {
                whereClause.schoolId = user.schoolId;
            }
        }

        const users = await User.findAll({ where: whereClause });
        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json({
            users: sortedUsers,
            districts: districts,
            schools: schools,
            grades: grades,
            userRole: user.role,
            currentUserId: user.id
        });
    } catch (err) {
        console.error('Erro ao buscar dados de usuários:', err);
        res.status(500).json({ error: 'Erro ao carregar dados de usuários' });
    }
};