//src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const usersService = require('../services/usersService');
const isAuthenticated = require('../middlewares/auth');

router.use(isAuthenticated);

// Rota para renderizar a página de criação de relatórios
router.get('/behavior', async (req, res) => {
    try {
        // Obter informações do usuário logado (do auth-service via middleware)
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Verificar se o usuário tem a role permitida para acessar a página
        const allowedRoles = ['Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Professor'];
        if (!loggedInUser || !allowedRoles.includes(loggedInUser.role)) {
            return res.status(403).send('Acesso não autorizado.');
        }

        // Chamar o users-service para obter a lista de todos os alunos
        const allStudents = await usersService.getUsers(accessToken);

        // Filtrar apenas os alunos (role === 'Aluno')
        const alunos = allStudents.filter(user => user.role === 'Aluno');

        // Formatar a lista de alunos para o autocomplete (nome (turma))
        const formattedStudents = alunos.map(student => ({
            id: student.id,
            nameWithClass: `${student.name} (${student.userClass || 'Sem turma'})`
        }));

        res.render('behavior', {
            title: 'Advertências',
            user: loggedInUser,
            students: formattedStudents,
        });

    } catch (err) {
        console.error('[REPORT-SERVICE - /report-form] Erro ao carregar a página de criação de relatórios:', err);
        res.status(500).send('Erro ao carregar a página de criação de relatórios.');
    }
});

// Rota para criar um relatório (gerado automaticamente pela IA)
router.post("/create", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const reportData = req.body;

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        const reportResponse = await reportService.createReport(accessToken, reportData);
        return res.status(200).json(reportResponse);
    } catch (error) {
        console.error('Erro ao criar relatório:', error);
        return res.status(500).json({ message: 'Erro ao criar relatório', error: error.message });
    }
});

// Rota para criar um relatório manual
router.post("/create/manual", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const reportData = req.body;
        console.log('Dados do relatório manual:', reportData);

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        const reportResponse = await reportService.createManualReport(accessToken, reportData);
        return res.status(200).json(reportResponse);
    } catch (error) {
        console.error('Erro ao criar relatório manual:', error);
        return res.status(500).json({ message: 'Erro ao criar relatório manual', error: error.message });
    }
});

router.get('/disciplinary-options', async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        const disciplinaryOptions = await reportService.getDisciplinaryOptions(accessToken);
        return res.status(200).json(disciplinaryOptions);
    } catch (error) {
        console.error('Erro ao buscar opções disciplinares:', error);
        return res.status(500).json({ message: 'Erro ao buscar opções disciplinares', error: error.message });
    }
});

// Rota para listar relatórios com filtros
router.get("/list", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        
        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        console.log('Query params recebidos:', req.query);
        
        // Passar todos os parâmetros da query diretamente
        const reports = await reportService.listReports(accessToken, req.query);
        return res.status(200).json(reports);

    } catch (error) {
        console.error('Erro ao listar relatórios:', error);
        return res.status(500).json({ 
            message: 'Erro ao listar relatórios', 
            error: error.message 
        });
    }
});

// Rota para deletar um relatório
router.delete("/delete/:id", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const reportId = req.params.id;
        
        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        await reportService.deleteReport(accessToken, reportId);
        return res.status(200).json({ 
            message: 'Relatório excluído com sucesso',
            deletedReportId: reportId 
        });

    } catch (error) {
        console.error('Erro ao deletar relatório:', error);
        return res.status(500).json({ 
            message: 'Erro ao deletar relatório', 
            error: error.message 
        });
    }
});

module.exports = router;