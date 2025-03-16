const User = require('../models/User'); 
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
            school,    // Nova entrada para a Escola
            district   // Nova entrada para a Secretaria
        } = req.body;

        // Verificar se o usuário já existe
        const usuarioExistente = await User.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'Usuário já existe.' });
        }

        const defaultPassword = process.env.DEFAULT_PASSWORD; 
        const newUser = await User.create({
            name,
            email,
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
            school,    // Adicionando a Escola
            district   // Adicionando a Secretaria
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
            school: usuarioAtualizado.school,    // Nova entrada para a Escola
            district: usuarioAtualizado.district, // Nova entrada para a Secretaria
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
        const { id } = req.params;  // Pegando o ID do parâmetro da URL
        
        // Encontrar o usuário no banco de dados
        const usuario = await User.findByPk(id); // Supondo que você está usando Sequelize (findByPk para buscar por ID)

        if (!usuario) {
            return res.status(404).send('Usuário não encontrado.');
        }

        res.json(usuario);  // Retorna o usuário em formato JSON
    } catch (error) {
        res.status(500).send(error.message);  // Se houver erro, retorna um erro 500
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
            attributes: ['id', 'name', 'email', 'role', 'district', 'school']
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

        const user = await User.findByPk(req.user.id); // Obtém o usuário atual
        // Captura os filtros da requisição GET
        const { district, school, role, subject, userClass, status } = req.query;
        let whereClause = {};

        if (user.role === 'Master') {
            // Master pode ver tudo
            whereClause = {};
        } else if (user.role === 'Inspetor') {
            // Inspetor vê todos do mesmo district
            whereClause.district = user.district;
        } else if (user.role === 'Diretor') {
            // Diretor vê Pedagogo, Coordenador, Professor e Aluno da mesma school e district
            whereClause.district = user.district;
            whereClause.school = user.school;
        } else if (user.role === 'Coordenador' || user.role === 'Pedagogo') {
            // Coordenador e Pedagogo veem Professor e Aluno da mesma school e district
            whereClause.district = user.district;
            whereClause.school = user.school;
        } else {
            // Professor e Aluno veem apenas dados próprios (mesma school e district)
            whereClause.district = user.district;
            whereClause.school = user.school;
        }

        // Ajusta a cláusula WHERE conforme os filtros, se fornecidos
        if (district) whereClause.district = district;
        if (school) whereClause.school = school;
        if (role) whereClause.role = role;
        if (subject) whereClause.subject = subject;
        if (userClass) whereClause.userClass = userClass;
        if (status) whereClause.status = status;

        // Busca os usuários com base na cláusula WHERE ajustada
        const users = await User.findAll({
            where: whereClause
        });

        // Ordenando os usuários
        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Retorna os usuários filtrados
        res.json({
            users: sortedUsers
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).send('Erro ao carregar os usuários');
    }
};
