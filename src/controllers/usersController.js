const User = require('../models/User'); 
const School = require('../models/School'); 
const bcrypt = require('bcrypt');
require('dotenv').config();

exports.adicionarUsuario = async (req, res) => {
    try {
        const { 
            name, 
            email, 
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
            districtId: formDistrictId // Renomear para evitar conflito
        } = req.body;

        // Verificar se o usuário já existe
        const usuarioExistente = await User.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'Usuário já existe.' });
        }

        const defaultPassword = process.env.DEFAULT_PASSWORD;

        // Lógica para tratar o valor de horario
        let horarioValue = horario;
        if (!horarioValue) {
            horarioValue = 'Integral'; // Define "Integral" se o valor estiver vazio
        } else if (!['Manhã', 'Tarde', 'Noite', 'Integral'].includes(horarioValue)) {
            return res.status(400).json({ message: 'Valor de horário inválido.' });
        }

        const zipInt = parseInt(zip);

        let finalDistrictId = formDistrictId; // Usar o valor do formulário por padrão

        // Verifica se o usuário está autenticado (supondo que `req.user` tenha o ID do usuário logado)
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }

        // Busca o usuário no banco de dados pelo ID da sessão
        const usuario = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'districtId', 'schoolId']
        });

        // Atribuir districtId do usuário logado se não for Master
        if (usuario.role !== 'Master') {
            finalDistrictId = usuario.districtId;
        }

        // Criando o novo usuário
        const newUser = await User.create({
            name,
            email,
            password: defaultPassword,
            cpf,
            phone,
            dateOfBirth,
            gender,
            role,
            horario: horarioValue,
            userClass,
            content,
            address,
            city,
            state,
            zip: zipInt,
            status,
            schoolId,
            districtId: finalDistrictId // Usar o districtId final
        });

        res.status(201).json({ message: 'Usuário criado com sucesso.' });
    } catch (error) {
        console.error(error);

        // Checar se é erro de validação
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Erro de validação', errors: error.errors });
        }

        // Tratar caso não tenha senha padrão definida
        if (error.message === 'Senha padrão não definida no .env') {
            return res.status(500).json({ message: 'Senha padrão não definida no arquivo .env' });
        }

        res.status(500).json({ message: 'Erro ao criar usuário.' });
    }
};

exports.listarUsuarios = async (req, res) => {
    try {
        const usuarios = await User.findAll();
        res.json(usuarios);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.atualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const dadosRecebidos = req.body;

        console.log('Dados recebidos:', dadosRecebidos);

        // Verificando se o usuário realmente existe antes de tentar atualizar
        const usuarioExistente = await User.findByPk(id);
        if (!usuarioExistente) {
            return res.status(404).send('Usuário não encontrado.');
        }

        // Criar um objeto apenas com os dados válidos
        const updatedData = {};
        Object.keys(dadosRecebidos).forEach((campo) => {
            if (dadosRecebidos[campo] !== undefined && dadosRecebidos[campo] !== '') {
                updatedData[campo] = dadosRecebidos[campo];
            }
        });

        // Se nenhum campo foi preenchido, evitar atualização desnecessária
        if (Object.keys(updatedData).length === 0) {
            return res.status(400).send('Nenhum dado válido para atualizar.');
        }

        // Atualizando o usuário
        await User.update(updatedData, { where: { id } });

        // Buscando o usuário atualizado
        const usuarioAtualizado = await User.findByPk(id);

        // Formatando a resposta para enviar os dados atualizados, incluindo as novas entradas
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
            schoolId: usuarioAtualizado.schoolId,    // Nova entrada para a Escola
            districtId: usuarioAtualizado.districtId, // Nova entrada para a Secretaria
            updatedAt: usuarioAtualizado.updatedAt
        };

        console.log('Usuário atualizado:', usuarioResponse);
        res.status(200).json(usuarioResponse);

    } catch (error) {
        console.error('Erro ao atualizar o usuário:', error);
        res.status(500).send('Erro ao atualizar o usuário.');
    }
};


exports.deletarUsuario = async (req, res) => {
    try {
        // Logando a entrada na função e o id do usuário
        const { id } = req.params;

        // Verificando se o id foi passado corretamente
        if (!id) {
            return res.status(400).send('ID do usuário é necessário.');
        }

        // Tentando excluir o usuário
        const deletado = await User.destroy({ where: { id } });

        if (!deletado) {
            // Caso o usuário não tenha sido encontrado ou não tenha sido deletado
            return res.status(404).send('Usuário não encontrado.');
        }

        // Se a exclusão foi bem-sucedida
        res.send('Usuário excluído com sucesso.');
    } catch (error) {
        // Caso ocorra um erro durante a execução
        console.error('Erro ao excluir o usuário:', error);
        res.status(500).send(error.message);
    }
};


exports.buscarUsuario = async (req, res) => {
    try {
        const { id } = req.params; // Pegando o ID do usuário

        // Buscar usuário pelo ID no banco, incluindo a escola associada
        const usuario = await User.findByPk(id, {
            attributes: { exclude: ['password'] }, // Exclui o password da resposta
        });

        if (!usuario) {
            return res.status(404).send('Usuário não encontrado.');
        }

        res.json(usuario); // Retorna o usuário sem o password
    } catch (error) {
        res.status(500).send(error.message); // Retorna erro 500 em caso de falha
    }
};

exports.buscarUsuarioLogado = async (req, res) => {
    try {
        // Verifica se o usuário está autenticado (supondo que `req.user` tenha o ID do usuário logado)
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }

        // Busca o usuário no banco de dados pelo ID da sessão
        const usuario = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'districtId', 'schoolId']
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        res.json(usuario);
    } catch (error) {
        console.error('Erro ao buscar usuário logado:', error);
        res.status(500).json({ message: 'Erro ao buscar usuário logado.' });
    }
};
exports.resetarSenha = async (req, res) => {
    try {
        const { id } = req.body; // O ID do usuário vem do body da requisição

        // Buscando o usuário pelo ID usando Sequelize
        const usuario = await User.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Recuperando a senha padrão do arquivo .env
        const defaultPassword = process.env.DEFAULT_PASSWORD;

        if (!defaultPassword) {
            return res.status(500).json({ message: 'Senha padrão não configurada.' });
        }

        // Atualizando a senha do usuário
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
        const { districtId, schoolId, role, subject, userClass, status } = req.query; // Mudança para schoolId
        let whereClause = {};

        if (user.role === 'Master') {
            // Master vê tudo, sem filtros iniciais
        } else if (user.role === 'Inspetor') {
            whereClause.districtId = user.districtId;
        } else if (['Diretor', 'Coordenador', 'Pedagogo'].includes(user.role)) {
            whereClause.districtId = user.districtId;
          
            if (user.schoolId !== undefined) { // Adiciona a verificação
                whereClause.schoolId = user.schoolId; // Usa schoolId
            }
        } else {
            whereClause.districtId = user.districtId;
            if (user.schoolId !== undefined) { // Adiciona a verificação
                whereClause.schoolId = user.schoolId; // Usa schoolId
            }
        }

        // Ajusta a cláusula WHERE conforme os filtros, se fornecidos
        if (districtId) whereClause.districtId = districtId;
        if (schoolId) whereClause.schoolId = schoolId; // Mudança para schoolId
        if (role) whereClause.role = role;
        if (subject) whereClause.subject = subject;
        if (userClass) whereClause.userClass = userClass;
        if (status) whereClause.status = status;

        const users = await User.findAll({ where: whereClause });

        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Buscar todas as escolas do distrito filtrado
        let schools = [];
        if (districtId) {
            schools = await School.findAll({
                where: { districtId },
                attributes: ['id', 'name'] // Pegamos apenas ID e nome da escola
            });
        }

        res.json({
            users: sortedUsers,
            schools // Agora a resposta contém um array de escolas no formato [{ id, name }]
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).send('Erro ao carregar os usuários');
    }
};