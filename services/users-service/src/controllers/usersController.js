const User = require('../models/User');
const Log = require('../models/Log');
const winston = require('winston');
const jwt = require('jsonwebtoken');
require('dotenv').config();
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
    applyUserListFilters,
    validarCPF,
    validarTelefone,
    validarDataNascimento,
    validarCEP
} = require('../services/userService');

const tentativasCriacao = new Map();
const MAX_TENTATIVAS = 20;
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

const verificarTentativas = (ip, isAuthenticated) => {
    // Se o usuário estiver autenticado, não conta tentativas
    if (isAuthenticated) {
        return { bloqueado: false };
    }

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
    body('phone').optional().custom(validarTelefone), // Telefone agora é opcional
    body('dateOfBirth').optional().custom(validarDataNascimento),
    body('gender').optional().isIn(['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer']).withMessage('Gênero inválido'),
    body('schoolId').optional(),
    body('districtId').optional(),
    body('address').optional(),
    body('city').optional(),
    body('state').optional(),
    body('zip').optional().custom(validarCEP).customSanitizer(value => value ? value.replace(/[^\d]/g, '').padStart(8, '0') : value),
    body('horario').optional().default('Integral').isIn(['Manhã', 'Tarde', 'Noite', 'Integral']).withMessage('Horário inválido'),
    body('gradeId').optional().isInt().withMessage('ID da turma deve ser um número inteiro'),
    body('content').optional(),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status inválido'),

    async (req, res) => {
        const ip = req.ip || req.connection.remoteAddress;
        const isAuthenticated = !!req.user;
        const verificação = verificarTentativas(ip, isAuthenticated);
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
                password, // Usamos diretamente a senha do req.body
                cpf,
                phone,
                dateOfBirth,
                gender,
                role,
                horario,
                gradeId,
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

            let finalDistrictId = formDistrictId;
            if (usuarioLogado.role !== 'Master') {
                finalDistrictId = usuarioLogado.districtId;
            }
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

            if (schoolId) {
                const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${schoolId}`;
                const schoolResponse = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
                if (!schoolResponse.ok) {
                    return res.status(400).json({ message: 'schoolId inválido.' });
                }
            }

            if (finalDistrictId) {
                const districtServiceUrl = `${process.env.DISTRICT_SERVICE_URL}/districts/${finalDistrictId}`;
                const districtResponse = await fetchDataWithAuth(districtServiceUrl, 'GET', null, accessToken);
                if (!districtResponse.ok) {
                    return res.status(400).json({ message: 'districtId inválido.' });
                }
            }

            // Verificar gradeId para alunos
            if (role === 'Aluno' && req.body.gradeId) {
                // Validar se a turma existe
                try {
                    const gradeServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/grades/${req.body.gradeId}`;
                    const gradeResponse = await fetchDataWithAuth(gradeServiceUrl, 'GET', null, accessToken);
                    
                    if (!gradeResponse.ok) {
                        return res.status(400).json({ message: 'Turma não encontrada ou inválida' });
                    }
                } catch (error) {
                    console.error('Erro ao verificar turma:', error);
                    // Decidir se continua ou retorna erro
                }
            }

            // Para não-alunos, gradeId deve ser null
            if (role !== 'Aluno') {
                req.body.gradeId = null;
            }

            const newUser = await User.create({
                name,
                email: novoEmail,
                password,
                cpf: cpf || null,
                phone: phone || null,
                dateOfBirth: dateOfBirth || null,
                gender: gender || null,
                role,
                horario: horario || null,
                gradeId: role === 'Aluno' ? req.body.gradeId : null,
                content: content || null,
                address: address || null,
                city: city || null,
                state: state || null,
                zip: zip || null,
                status: status || 'active',
                schoolId: schoolId || null,
                districtId: finalDistrictId || null,
                userClass: req.body.userClass || null
            });

            invalidarCache();
            await logService.logUserOperation('criacao', newUser.id, { criadoPor: usuarioLogado.id, role: newUser.role });
            res.status(201).json({ message: 'Usuário criado com sucesso.' });

        } catch (error) {
            console.error(error);
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ message: 'Erro de validação', errors: error.errors });
            }
            await logService.error('Erro ao criar usuário', { error: error.message });
            res.status(500).json({ message: 'Erro ao criar usuário.' });
        }
    }
];

exports.listarUsuariosValidados = async (req, res) => {
    try {
        let whereClause = {};

        console.log('req.query:', req.query); // Log dos parâmetros da query

        if (Object.keys(req.query).length > 0) {
            whereClause = applyUserListFilters(req.query);
            console.log('whereClause (com filtros):', whereClause); // Log da whereClause com filtros
        } else {
            console.log('whereClause (sem filtros):', whereClause); // Log da whereClause sem filtros
        }

        const usuarios = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password'] }
        });

        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar/filtrar usuários:', error);
        await logService.error('Erro ao listar/filtrar usuários', { error: error.message });
        res.status(500).json({ message: 'Erro ao listar/filtrar usuários.' });
    }
};

exports.listarUsuarios = async (req, res) => {
    try {
        // Verificar autenticação
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }

        const requesterData = await User.findByPk(req.user.id);
        if (!requesterData) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        let whereClause = {};
        console.log('req.query:', req.query);

        // Buscar todos os usuários primeiro
        const allUsers = await User.findAll({
            attributes: { exclude: ['password'] }
        });

        // Filtrar manualmente com JavaScript
        let filteredUsers = allUsers;

        // Filtro por nome (case insensitive)
        if (req.query.query) {
            filteredUsers = filteredUsers.filter(user => 
                user.name.toLowerCase().includes(req.query.query.toLowerCase())
            );
        }

        // Filtro por role
        if (req.query.role) {
            filteredUsers = filteredUsers.filter(user => 
                user.role === req.query.role
            );
        }

        // Filtro por distrito
        if (req.query.districtId && req.query.districtId !== '') {
            filteredUsers = filteredUsers.filter(user => 
                // Convert both to strings for comparison
                String(user.districtId) === String(req.query.districtId)
            );
        }


        // Restrições baseadas no papel do usuário
        if (requesterData.role !== 'Master' && requesterData.role !== 'Inspetor') {
            filteredUsers = filteredUsers.filter(user => 
                user.schoolId === requesterData.schoolId && 
                user.districtId === requesterData.districtId
            );
        }

        console.log(`Quantidade de usuários encontrados: ${filteredUsers.length}`);
        res.json(filteredUsers);

    } catch (error) {
        console.error('Erro ao listar/filtrar usuários:', error);
        res.status(500).json({ message: 'Erro ao listar/filtrar usuários.' });
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
    body('gradeId').optional().isInt().withMessage('ID da turma deve ser um número inteiro'),
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
                const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${updatedData.schoolId}`;
                const schoolResponse = await fetchDataWithAuth(schoolServiceUrl, 'GET', null, accessToken);
                if (!schoolResponse.ok) {
                    return res.status(400).json({ message: 'schoolId inválido.' });
                }
            }

            if (updatedData.districtId) {
                const districtServiceUrl = `${process.env.DISTRICT_SERVICE_URL}/districts/${updatedData.districtId}`;
                const districtResponse = await fetchDataWithAuth(districtServiceUrl, 'GET', null, accessToken);
                if (!districtResponse.ok) {
                    return res.status(400).json({ message: 'districtId inválido.' });
                }
            }

            // Antes de fazer o update:
            if (updatedData.gradeId && dadosRecebidos.role === 'Aluno') {
                // Validar se a turma existe
                try {
                    const gradeServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/grades/${updatedData.gradeId}`;
                    const gradeResponse = await fetchDataWithAuth(gradeServiceUrl, 'GET', null, accessToken);
                    
                    if (!gradeResponse.ok) {
                        return res.status(400).json({ message: 'Turma não encontrada ou inválida' });
                    }
                } catch (error) {
                    console.error('Erro ao verificar turma:', error);
                    // Decidir se continua ou retorna erro
                }
            }

            // Se não é aluno, gradeId deve ser nulo
            if (updatedData.role && updatedData.role !== 'Aluno') {
                updatedData.gradeId = null;
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
                gradeId: usuarioAtualizado.gradeId, // Adicionar este campo
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

        // 1. Excluir os logs associados ao usuário
        await Log.destroy({
            where: {
                userId: id
            }
        });

        // 2. Excluir o usuário
        await User.destroy({ where: { id } });

        res.json({ message: 'Usuário e logs associados excluídos com sucesso.' });

    } catch (error) {
        console.error('Erro ao excluir o usuário e seus logs:', error);
        await logService.error('Erro ao excluir usuário e seus logs', { error: error.message, id: req.params.id });
        res.status(500).json({ message: 'Erro ao excluir o usuário e seus logs.' });
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
        let grade = null;
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

        // Se o usuário for aluno e tiver gradeId, buscar detalhes da turma
        if (usuario.role === 'Aluno' && usuario.gradeId) {
            const gradeServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/grades/${usuario.gradeId}`;
            const gradeResponse = await fetchDataWithAuth(gradeServiceUrl, 'GET', null, accessToken);
            if (gradeResponse.ok) {
                grade = await gradeResponse.json();
            } else {
                console.error('Erro ao buscar turma do school-service:', gradeResponse.statusText);
            }
        }

        res.json({ ...usuario.toJSON(), school, district, grade });
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
        console.log('users-service: Iniciando resetarSenha');
        console.log('users-service: req.body:', req.body);
        console.log('users-service: req.params:', req.params);

        const id = req.body.userId || req.params.id;
        console.log('users-service: ID a ser buscado:', id);

        const usuario = await User.findByPk(id);
        console.log('users-service: Resultado da busca (usuário):', usuario);

        if (!usuario) {
            console.log('users-service: Usuário não encontrado com ID:', id);
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        let newPasswordToSet = req.body.newPassword;
        const defaultPassword = process.env.DEFAULT_PASSWORD;

        if (!newPasswordToSet) { // Se newPassword for vazio (ou undefined)
            console.log('users-service: newPassword não fornecida, usando DEFAULT_PASSWORD');
            newPasswordToSet = defaultPassword;
        } else {
            console.log('users-service: newPassword fornecida:', newPasswordToSet);
        }

        if (!defaultPassword && !newPasswordToSet) {
            return res.status(500).json({ message: 'Senha padrão não configurada e nenhuma nova senha fornecida.' });
        }

        usuario.password = newPasswordToSet || defaultPassword; // Use newPassword se fornecida, senão a padrão
        await usuario.save();
        console.log('users-service: Senha do usuário com ID:', id, 'resetada com sucesso.');

        res.status(200).json({
            message: 'Senha resetada com sucesso!',
            novaSenha: newPasswordToSet || defaultPassword
        });
    } catch (error) {
        console.error('users-service: Erro ao resetar a senha:', error);
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

        // Buscar turmas do microsserviço school-service
        const gradeServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/grades`;
        const gradeResponse = await fetchDataWithAuth(gradeServiceUrl, 'GET', null, accessToken);
        let grades = [];
        if (gradeResponse.ok) {
            grades = await gradeResponse.json();
        } else {
            console.error('Erro ao buscar turmas do school-service:', gradeResponse.statusText);
        }

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