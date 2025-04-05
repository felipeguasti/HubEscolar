const User = require('../models/User');
const fetch = require('node-fetch');
const { body, validationResult } = require('express-validator');
const { emailExiste, invalidarCache } = require('../services/userCacheService');
const logService = require('../services/logService');
require('dotenv').config();

// Cache para armazenar tentativas de criação
const tentativasCriacao = new Map();
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO = 15 * 60 * 1000; // 15 minutos em milissegundos

// Função para verificar e registrar tentativas
const verificarTentativas = (ip) => {
    const agora = Date.now();
    const tentativas = tentativasCriacao.get(ip) || { contador: 0, ultimaTentativa: 0 };

    // Limpa tentativas antigas
    if (agora - tentativas.ultimaTentativa > TEMPO_BLOQUEIO) {
        tentativas.contador = 0;
    }

    // Incrementa contador
    tentativas.contador++;
    tentativas.ultimaTentativa = agora;
    tentativasCriacao.set(ip, tentativas);

    // Verifica se excedeu o limite
    if (tentativas.contador > MAX_TENTATIVAS) {
        const tempoRestante = Math.ceil((TEMPO_BLOQUEIO - (agora - tentativas.ultimaTentativa)) / 1000 / 60);
        return {
            bloqueado: true,
            tempoRestante
        };
    }

    return { bloqueado: false };
};

// Função para validar CPF
const validarCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto > 9 ? 0 : resto;
    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto > 9 ? 0 : resto;
    if (digitoVerificador2 !== parseInt(cpf.charAt(10))) return false;
    
    return true;
};

// Função para validar telefone
const validarTelefone = (telefone) => {
    // Remove todos os caracteres não numéricos
    telefone = telefone.replace(/[^\d]/g, '');
    
    // Verifica se tem entre 10 e 11 dígitos (com DDD)
    if (telefone.length < 10 || telefone.length > 11) return false;
    
    // Verifica se começa com 9 (celular) ou 2-5 (fixo)
    const primeiroDigito = telefone.charAt(telefone.length - 9);
    return /^[2-5]|^9/.test(primeiroDigito);
};

// Função para validar data de nascimento
const validarDataNascimento = (data) => {
    const dataNascimento = new Date(data);
    const hoje = new Date();
    const idadeMinima = 14; // Idade mínima para cadastro
    
    // Verifica se é uma data válida
    if (isNaN(dataNascimento.getTime())) return false;
    
    // Verifica se não é uma data futura
    if (dataNascimento > hoje) return false;
    
    // Calcula a idade
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mes = hoje.getMonth() - dataNascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNascimento.getDate())) {
        idade--;
    }
    
    return idade >= idadeMinima;
};

// Função para validar CEP
const validarCEP = (cep) => {
    // Remove todos os caracteres não numéricos
    cep = cep.replace(/[^\d]/g, '');
    
    // Verifica se tem 8 dígitos
    if (cep.length !== 8) return false;
    
    // Verifica se é um CEP válido (primeiro dígito não pode ser 0)
    return /^[1-9]\d{7}$/.test(cep);
};

// Função para verificar permissões de criação de usuário
const verificarPermissaoCriacao = (roleUsuarioLogado, roleNovoUsuario) => {
    // Define as permissões por role
    const permissoes = {
        'Master': ['Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Inspetor': ['Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Diretor': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Secretario': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Coordenador': [],
        'Pedagogo': [],
        'Professor': [],
        'Aluno': []
    };

    // Verifica se o role do usuário logado existe nas permissões
    if (!permissoes.hasOwnProperty(roleUsuarioLogado)) {
        return {
            permitido: false,
            mensagem: 'Usuário com role inválido.'
        };
    }

    // Verifica se o usuário tem permissão para criar o role especificado
    if (!permissoes[roleUsuarioLogado].includes(roleNovoUsuario)) {
        return {
            permitido: false,
            mensagem: `Usuário ${roleUsuarioLogado} não tem permissão para criar usuário ${roleNovoUsuario}.`
        };
    }

    return {
        permitido: true
    };
};

// Função para verificar permissões de edição
const verificarPermissaoEdicao = (roleUsuarioLogado, roleUsuarioAlvo, idUsuarioLogado, idUsuarioAlvo) => {
    // Se for o próprio usuário, pode editar suas próprias informações
    if (idUsuarioLogado === idUsuarioAlvo) {
        return { permitido: true };
    }

    // Define as permissões por role
    const permissoes = {
        'Master': ['Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Inspetor': ['Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Diretor': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Secretario': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Coordenador': ['Professor', 'Aluno'],
        'Pedagogo': ['Professor', 'Aluno'],
        'Professor': [],
        'Aluno': []
    };

    if (!permissoes.hasOwnProperty(roleUsuarioLogado)) {
        return {
            permitido: false,
            mensagem: 'Usuário com role inválido.'
        };
    }

    if (!permissoes[roleUsuarioLogado].includes(roleUsuarioAlvo)) {
        return {
            permitido: false,
            mensagem: `Usuário ${roleUsuarioLogado} não tem permissão para editar usuário ${roleUsuarioAlvo}.`
        };
    }

    return { permitido: true };
};

exports.adicionarUsuario = [
    // Validações dos campos
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
    body('role').notEmpty().withMessage('Papel é obrigatório'),
    body('cpf')
        .optional()
        .custom((value) => {
            if (value && !validarCPF(value)) {
                throw new Error('CPF inválido');
            }
            return true;
        }),
    body('phone')
        .optional()
        .custom((value) => {
            if (value && !validarTelefone(value)) {
                throw new Error('Telefone inválido');
            }
            return true;
        }),
    body('dateOfBirth')
        .optional()
        .custom((value) => {
            if (value && !validarDataNascimento(value)) {
                throw new Error('Data de nascimento inválida ou idade mínima não atingida');
            }
            return true;
        }),
    body('gender')
        .optional()
        .isIn(['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'])
        .withMessage('Gênero inválido'),
    body('schoolId').optional(),
    body('districtId').optional(),
    body('address').optional(),
    body('city').optional(),
    body('state').optional(),
    body('zip')
        .optional()
        .custom((value) => {
            if (value && !validarCEP(value)) {
                throw new Error('CEP inválido');
            }
            return true;
        })
        .customSanitizer(value => {
            // Se o valor existir, mantém como string com zeros à esquerda
            if (value) {
                return value.replace(/[^\d]/g, '').padStart(8, '0');
            }
            return value;
        }),
    body('horario')
        .optional()
        .default('Integral')  // Define o valor padrão durante a validação
        .isIn(['Manhã', 'Tarde', 'Noite', 'Integral'])
        .withMessage('Horário inválido'),
    body('class').optional(),
    body('content').optional(),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status inválido'),

    async (req, res) => {
        // Verifica tentativas de criação
        const ip = req.ip || req.connection.remoteAddress;
        const verificação = verificarTentativas(ip);
        
        if (verificação.bloqueado) {
            return res.status(429).json({
                message: `Muitas tentativas de criação. Tente novamente em ${verificação.tempoRestante} minutos.`
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { email } = req.body;

            // Verifica se o email existe usando o cache
            if (await emailExiste(email)) {
                return res.status(400).json({ message: 'Usuário já existe.' });
            }

            // Verifica autenticação
            if (!req.user || !req.user.id) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            const usuarioLogado = await User.findByPk(req.user.id, {
                attributes: ['id', 'name', 'email', 'role', 'districtId', 'schoolId']
            });

            if (!usuarioLogado) {
                return res.status(401).json({ message: 'Usuário não encontrado.' });
            }

            const { role: novoRole } = req.body;

            // Verifica permissões
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

            const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${schoolId}`;
            const schoolResponse = await fetch(schoolServiceUrl);
            if (!schoolResponse.ok) {
                return res.status(400).json({ message: 'schoolId inválido.' });
            }

            if (finalDistrictId) {
                const districtServiceUrl = `${process.env.DISTRICT_SERVICE_URL}/districts/${finalDistrictId}`;
                const districtResponse = await fetch(districtServiceUrl);
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

            // Invalida o cache após criar um novo usuário
            invalidarCache();

            await logService.logUserOperation('criacao', newUser.id, {
                criadoPor: usuarioLogado.id,
                role: newUser.role
            });

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
        res.status(500).json({ message: error.message });
    }
};

exports.atualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const dadosRecebidos = req.body;

        // Verifica autenticação
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }

        const usuarioLogado = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'districtId', 'schoolId']
        });

        if (!usuarioLogado) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }

        const usuarioAlvo = await User.findByPk(id);
        if (!usuarioAlvo) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Verifica permissões
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

        if (updatedData.schoolId) {
            const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${updatedData.schoolId}`;
            const schoolResponse = await fetch(schoolServiceUrl);
            if (!schoolResponse.ok) {
                return res.status(400).json({ message: 'schoolId inválido.' });
            }
        }

        if (updatedData.districtId) {
            const districtServiceUrl = `${process.env.DISTRICT_SERVICE_URL}/districts/${updatedData.districtId}`;
            const districtResponse = await fetch(districtServiceUrl);
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

        await logService.logUserOperation('edicao', id, {
            editadoPor: usuarioLogado.id,
            alteracoes: updatedData
        });

        res.status(200).json(usuarioResponse);
    } catch (error) {
        console.error('Erro ao atualizar o usuário:', error);
        await logService.error('Erro ao atualizar usuário', { 
            error: error.message,
            id: req.params.id
        });
        res.status(500).json({ message: 'Erro ao atualizar o usuário.' });
    }
};

exports.deletarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica autenticação
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }

        const usuarioLogado = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'districtId', 'schoolId']
        });

        if (!usuarioLogado) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }

        const usuarioAlvo = await User.findByPk(id);
        if (!usuarioAlvo) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Define as permissões de exclusão por role
        const permissoesExclusao = {
            'Master': ['Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
            'Inspetor': ['Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
            'Diretor': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
            'Secretario': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno']
        };

        // Verifica se o usuário tem permissão para excluir
        if (!permissoesExclusao[usuarioLogado.role]) {
            return res.status(403).json({ message: 'Sem permissão para excluir usuários.' });
        }

        // Verifica se pode excluir o usuário alvo
        if (!permissoesExclusao[usuarioLogado.role].includes(usuarioAlvo.role)) {
            return res.status(403).json({ 
                message: `${usuarioLogado.role} não tem permissão para excluir usuário ${usuarioAlvo.role}.` 
            });
        }

        await User.destroy({ where: { id } });
        res.json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir o usuário:', error);
        await logService.error('Erro ao excluir usuário', { 
            error: error.message,
            id: req.params.id
        });
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

        if (usuario.schoolId) {
            const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${usuario.schoolId}`;
            const schoolResponse = await fetch(schoolServiceUrl);
            if (schoolResponse.ok) {
                school = await schoolResponse.json();
            } else {
                console.error('Erro ao buscar escola do school-service:', schoolResponse.statusText);
            }
        }

        if (usuario.districtId) {
            const districtServiceUrl = `${process.env.DISTRICT_SERVICE_URL}/districts/${usuario.districtId}`;
            const districtResponse = await fetch(districtServiceUrl);
            if (districtResponse.ok) {
                district = await districtResponse.json();
            } else {
                console.error('Erro ao buscar distrito do district-service:', districtResponse.statusText);
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

        const usuario = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'districtId', 'schoolId']
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        let school = null;
        if (usuario.schoolId) {
            const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools/${usuario.schoolId}`;
            const schoolResponse = await fetch(schoolServiceUrl);
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

const applyUserFilters = (user, query) => {
    let whereClause = {};

    if (user.role === 'Master') {
    } else if (user.role === 'Inspetor') {
        whereClause.districtId = user.districtId;
    } else if (['Diretor', 'Coordenador', 'Pedagogo'].includes(user.role)) {
        whereClause.districtId = user.districtId;
        if (user.schoolId !== undefined) {
            whereClause.schoolId = user.schoolId;
        }
    } else {
        whereClause.districtId = user.districtId;
        if (user.schoolId !== undefined) {
            whereClause.schoolId = user.schoolId;
        }
    }

    if (query.districtId) whereClause.districtId = query.districtId;
    if (query.schoolId) whereClause.schoolId = query.schoolId;
    if (query.role) whereClause.role = query.role;
    if (query.subject) whereClause.subject = query.subject;
    if (query.userClass) whereClause.userClass = query.userClass;
    if (query.status) whereClause.status = query.status;

    return whereClause;
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
        if (req.query.districtId) {
            const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools?districtId=${req.query.districtId}`;
            const response = await fetch(schoolServiceUrl);
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

        // Buscar escolas do microsserviço school-service
        const schoolServiceUrl = `${process.env.SCHOOL_SERVICE_URL}/schools`;
        const schoolResponse = await fetch(schoolServiceUrl);
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