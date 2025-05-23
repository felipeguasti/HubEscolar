const express = require('express');
const router = express.Router();
const usersService = require('../services/usersService');
const districtsService = require('../services/districtService');
const gradeService = require('../services/gradeService');
const schoolsService = require('../services/schoolService');
const isAuthenticated = require('../middlewares/auth');
require('dotenv').config();
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD


// Rota para renderizar a página
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Obter informações do usuário logado (do auth-service via middleware)
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Chamar o users-service para obter a lista de usuários
        let users = await usersService.getUsers(accessToken);

        // Filtrar usuários com base na role
        let filteredUsers = users;
        if (loggedInUser.role !== 'Master') {
            // Criar objeto de filtros baseado no role
            const filters = {
                districtId: loggedInUser.districtId,
                ...(loggedInUser.role !== 'Inspetor' && { schoolId: loggedInUser.schoolId })
            };
            
            const response = await usersService.filterUsers(filters, accessToken);
            // Garantir que filteredUsers seja sempre um array
            filteredUsers = response.users || response || [];
        }

        // Agora podemos usar map com segurança
        const usersWithCorrectedDates = filteredUsers.map(user => ({
            ...user,
            createdAt: user.createdAt ? new Date(user.createdAt) : null,
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
            dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null
        }));

        // Chamar o districts-service para obter a lista de distritos
        const districts = await districtsService.getAllDistricts(accessToken, 1, 100);

        // Chamar o schools-service para obter a lista de escolas
        const schools = await schoolsService.getAllSchools(accessToken);

        // Buscar as turmas diretamente do banco de dados local
        let grades = await gradeService.getAllGrades(accessToken);
        
        // Garantir que grades seja sempre um array
        grades = Array.isArray(grades) ? grades : 
                 (grades && Array.isArray(grades.data)) ? grades.data : [];
        
        // Adicionar debug para verificar a estrutura
        console.log('Estrutura de grades:', {
            isArray: Array.isArray(grades),
            length: grades.length,
            sample: grades.length > 0 ? grades[0] : null
        });

        // Buscar o usuário a ser editado (se o userId for fornecido)
        let editingUser = null;
        if (req.query.userId) {
            editingUser = await usersService.getUserById(req.query.userId, accessToken);
        }

        res.render('users', {
            title: 'Usuários',
            user: loggedInUser,
            users: usersWithCorrectedDates,
            districts: districts.data,
            schools: schools,
            grades: grades,
            editingUser: editingUser,
            selectedDistrict: loggedInUser.districtId,
            selectedSchool: loggedInUser.schoolId,
            userRole: loggedInUser.role,
            currentUserId: loggedInUser.id,
            userSchool: loggedInUser.schoolId
        });

    } catch (err) {
        console.error('[USERS-DISTRICT - /] Erro ao buscar dados para a página de usuários:', err);
        res.status(500).send('Erro ao carregar a página de usuários');
    }
});

// Rota para adicionar um usuário (chama o users-service)
router.post('/create', isAuthenticated, async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        // Remove espaços e símbolos do número de telefone
        if (req.body.phone) {
            req.body.phone = req.body.phone.replace(/[^\d]/g, '');
        }

        let userData = { ...req.body };

        // Lógica baseada no papel do usuário logado
        if (req.user.role !== 'Master') {
            if (req.user.role === 'Inspetor') {
                userData.districtId = req.user.districtId;
            } else {
                userData.districtId = req.user.districtId;
                userData.schoolId = req.user.schoolId;
            }
        }
        
        // Verificar se o usuário é um aluno e está sendo associado a uma turma
        if (userData.role === 'Aluno' && userData.gradeId) {
            try {
                // Obter detalhes da turma para extrair o horário
                console.log(`Usuário é Aluno - buscando detalhes da turma ID: ${userData.gradeId}`);
                const gradeDetails = await gradeService.getGradeById(accessToken, userData.gradeId);
                
                // Verificar se os detalhes da turma foram obtidos corretamente
                if (gradeDetails && gradeDetails.data) {
                    // Sobrescrever o horário enviado pelo formulário com o horário da turma
                    userData.horario = gradeDetails.data.shift;
                    console.log(`Horário obtido da turma: ${userData.horario}`);
                } else {
                    console.warn(`Não foi possível obter detalhes da turma ID: ${userData.gradeId}`);
                }
            } catch (gradeError) {
                console.error(`Erro ao buscar detalhes da turma: ${gradeError.message}`);
                // Continuamos o processo mesmo se falhar a obtenção da turma
            }
        } else {
            // Para outros papéis, manter o horário enviado pelo formulário
            console.log(`Usuário não é Aluno ou não tem turma - usando horário do formulário: ${userData.horario}`);
        }
        
        const userDataWithPassword = {
            ...userData,
            password: ('password' in req.body) ? req.body.password : DEFAULT_PASSWORD
        };

        const newUser = await usersService.createUser(userDataWithPassword, accessToken);
        return res.status(201).json(newUser);
    } catch (error) {
        console.error('Erro ao adicionar usuário:', error);
        
        // Verifica se é um erro do microserviço
        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                message: error.response.data.message
            });
        }

        // Se não for erro do microserviço, retorna erro genérico
        return res.status(500).json({ 
            message: 'Erro interno ao criar usuário',
            error: error.message 
        });
    }
});

router.get('/list', isAuthenticated, async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        // Passa os parâmetros da query para o users-
        const users = await usersService.getUsers(accessToken, req.query);
        return res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        return res.status(500).json({ message: 'Erro ao listar usuários', error: error.message });
    }
});

// Rota para atualizar um usuário por ID (chama o users-service)
router.put('/edit/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        // Cria uma cópia dos dados recebidos
        let userData = { ...req.body };
        
        // Remove espaços e símbolos do número de telefone
        if (userData.phone) {
            userData.phone = userData.phone.replace(/[^\d]/g, '');
        }
        
        // Verificar se o usuário é um aluno e está sendo associado a uma turma
        if (userData.role === 'Aluno' && userData.gradeId) {
            try {
                // Obter detalhes da turma para extrair o horário
                console.log(`Editando Aluno - buscando detalhes da turma ID: ${userData.gradeId}`);
                const gradeDetails = await gradeService.getGradeById(accessToken, userData.gradeId);
                
                // Verificar se os detalhes da turma foram obtidos corretamente
                if (gradeDetails && gradeDetails.data) {
                    // Sobrescrever o horário enviado pelo formulário com o horário da turma
                    userData.horario = gradeDetails.data.shift;
                    console.log(`Horário atualizado da turma: ${userData.horario}`);
                } else {
                    console.warn(`Não foi possível obter detalhes da turma ID: ${userData.gradeId}`);
                }
            } catch (gradeError) {
                console.error(`Erro ao buscar detalhes da turma: ${gradeError.message}`);
                // Continuamos o processo mesmo se falhar a obtenção da turma
            }
        } else {
            // Para outros papéis, manter o horário enviado pelo formulário
            console.log(`Usuário não é Aluno ou não tem turma - usando horário do formulário: ${userData.horario}`);
        }
        
        const updatedUser = await usersService.updateUser(id, userData, accessToken);
        return res.json(updatedUser);
    } catch (error) {
        console.error(`Erro ao atualizar usuário com ID ${id}:`, error);
        
        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                message: error.response.data.message
            });
        }

        return res.status(500).json({ 
            message: 'Erro ao atualizar usuário',
            error: error.message 
        });
    }
});

// Rota para deletar um usuário por ID (chama o users-service)
router.delete('/delete/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        await usersService.deleteUser(id, accessToken);
        return res.status(204).send();
    } catch (error) {
        console.error(`Erro ao deletar usuário com ID ${id}:`, error);
        
        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                message: error.response.data.message
            });
        }

        return res.status(500).json({ 
            message: 'Erro ao deletar usuário',
            error: error.message 
        });
    }
});

// Rota para buscar o usuário logado (chama o users-service)
router.get('/me', isAuthenticated, async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const loggedInUser = await usersService.getLoggedInUser(accessToken);
        if (loggedInUser) {
            return res.json(loggedInUser);
        } else {
            return res.status(404).json({ message: 'Usuário logado não encontrado' });
        }
    } catch (error) {
        console.error('[AUTH-SERVICE] Erro ao buscar usuário logado:', error);
        return res.status(500).json({ message: 'Erro ao buscar usuário logado', error: error.message });
    }
});
// Rota para buscar um usuário por ID (chama o users-service)
router.get('/list/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const user = await usersService.getUserById(id, accessToken);
        if (user) {
            return res.json(user);
        } else {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error(`Erro ao buscar usuário com ID ${id}:`, error);
        return res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
    }
});

// Rota para filtrar usuários (chama o users-service)
router.get('/filter', isAuthenticated, async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        console.log('Filtros recebidos:', req.query);
        const filteredUsers = await usersService.filterUsers(req.query, accessToken);
        return res.json(filteredUsers);
    } catch (error) {
        console.error('Erro ao filtrar usuários:', error);
        
        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                message: error.response.data.message
            });
        }

        return res.status(500).json({ 
            message: 'Erro ao filtrar usuários',
            error: error.message 
        });
    }
});

// Rota para resetar a senha de um usuário (chama o users-service)
router.post('/reset-password', isAuthenticated, async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const userIdToReset = req.body.userId;
        const newPassword = req.body.newPassword;

        // Verificar se o usuário autenticado é Master ou Inspetor
        if (!req.user || (req.user.role !== 'Master' && req.user.role !== 'Inspetor')) {
            return res.status(403).json({ message: 'Acesso negado. Apenas usuários Master e Inspetor podem resetar senhas.' });
        }

        if (!userIdToReset) {
            return res.status(400).json({ message: 'ID do usuário a ser resetado não fornecido.' });
        }

        const result = await usersService.resetPassword(userIdToReset, newPassword, accessToken);
        return res.json(result);
    } catch (error) {
        console.error('Erro ao resetar senha do usuário:', error);
        
        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                message: error.response.data.message
            });
        }

        return res.status(500).json({ 
            message: 'Erro ao resetar senha do usuário',
            error: error.message 
        });
    }
});

// Rota para resetar a senha de um usuário específico (acesso restrito a Master e Inspetor)
router.post('/reset/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Verificar se o usuário autenticado é Master ou Inspetor
        if (!req.user || (req.user.role !== 'Master' && req.user.role !== 'Inspetor')) {
            return res.status(403).json({ message: 'Acesso negado. Apenas usuários Master e Inspetor podem resetar senhas.' });
        }

        // Chamar o authService para resetar a senha do usuário
        const response = await authService.adminResetPassword(id);

        if (response.success) {
            await logService.info(`Senha do usuário (ID: ${id}) resetada para a senha padrão pelo usuário ${req.user.role} (ID: ${req.user.id}).`);
            return res.status(200).json({ message: response.message });
        } else {
            return res.status(response.status || 500).json({ message: response.message || 'Erro ao resetar a senha.' });
        }

    } catch (error) {
        console.error('Erro ao resetar a senha do usuário via authService:', error);
        await logService.error('Erro ao resetar a senha do usuário via authService', { error: error.message, userId: id, requestedBy: req.user ? req.user.id : 'Não autenticado' });
        return res.status(500).json({ message: 'Erro ao resetar a senha do usuário', error: error.message });
    }
});

// Rota para obter dados de usuários (chama o users-service)
router.get('/data', isAuthenticated, async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const usersData = await usersService.getUsersData(accessToken);
        return res.json(usersData);
    } catch (error) {
        console.error('Erro ao obter dados de usuários:', error);
        return res.status(500).json({ message: 'Erro ao obter dados de usuários', error: error.message });
    }
});

module.exports = router;