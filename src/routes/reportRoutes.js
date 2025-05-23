//src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const usersService = require('../services/usersService');
const mediaService = require('../services/mediaService');
const isAuthenticated = require('../middlewares/auth');
const { now } = require('moment');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Get full user data
        const userData = await usersService.getUserById(loggedInUser.id, accessToken);

        res.render('reports/index', {
            title: 'Relatórios',
            user: userData
        });
    } catch (error) {
        console.error('Erro ao carregar página de relatórios:', error);
        res.status(500).send('Erro ao carregar página de relatórios');
    }
});

router.get('/center', async (req, res) => {
    try {
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Get full user data
        const userData = await usersService.getUserById(loggedInUser.id, accessToken);

        // Get reports from service
        const reports = await reportService.listReports(accessToken, {
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            order: 'DESC'
        });

        // Create stats object
            const stats = {
            total: reports?.total || 0,
            pending: reports?.items?.filter(r => r.status === 'pending')?.length || 0,
            delivered: reports?.items?.filter(r => r.status === 'delivered')?.length || 0, // Mudar de signed para delivered
            archived: reports?.items?.filter(r => r.status === 'archived')?.length || 0
        };

        res.render('reports/center', {
            title: 'Central de Advertências',
            user: userData,
            reports: reports?.items || [],
            pagination: {
                current: 1,
                pages: Math.ceil((reports?.total || 0) / 10)
            },
            stats // Pass the stats object to the template
        });

    } catch (error) {
        console.error('Erro ao carregar central de advertências:', error);
        res.status(500).send('Erro ao carregar central de advertências');
    }
});
// Rota para o centro de relatórios
router.get('/meetings', async (req, res) => {
    try {
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        // Get full user data
        const userData = await usersService.getUserById(loggedInUser.id, accessToken);

        res.render('reports/meetings', {
            title: 'Atas e Registros',
            user: userData
        });
    } catch (error) {
        console.error('Erro ao carregar central de relatórios:', error);
        res.status(500).send('Erro ao carregar central de relatórios');
    }
});

module.exports = router;
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

        res.render('reports/behavior', {
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

// Rota para gerar PDF do relatório
router.get("/:id/print", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const reportId = req.params.id;
        const schoolId = req.user.schoolId;
        
        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        // 1. Buscar URLs dos logos
        const logos = await mediaService.getLogosUrl(schoolId, accessToken);
        // 3. Gerar PDF com as URLs dos logos
        const pdfBuffer = await reportService.generateReportPDF(
            accessToken, 
            reportId,
            logos
        );

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=advertencia-${reportId}.pdf`);
        
        return res.send(pdfBuffer);

    } catch (error) {
        console.error('Erro ao gerar PDF do relatório:', error);
        return res.status(500).json({ 
            message: 'Erro ao gerar PDF do relatório', 
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

// Rota para registrar entrega do relatório
router.post("/:id/deliver", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const reportId = req.params.id;
        const { method, parentResponse, signedBy, signedAt, deliveredAt } = req.body;
        
        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        if (!method) {
            return res.status(400).json({ error: 'Método de entrega não fornecido.' });
        }

        // Chamar o serviço para registrar a entrega
        await reportService.registerDelivery(
            accessToken, 
            reportId, 
            {
                method,
                parentResponse,
                signedBy,
                deliveredBy: req.user.id,
                signedAt
            }
        );

        return res.status(200).json({ 
            message: 'Entrega registrada com sucesso',
            reportId 
        });

    } catch (error) {
        console.error('Erro ao registrar entrega:', error);
        return res.status(500).json({ 
            message: 'Erro ao registrar entrega', 
            error: error.message 
        });
    }
});

// Rota para atualizar entrega via WhatsApp
router.patch("/:id/update-delivery", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const reportId = req.params.id;
        const { deliveryMethod, deliveryConfirmation, deliveredAt, status } = req.body;
        
        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        // Validar campos obrigatórios
        if (!deliveryMethod || !deliveryConfirmation) {
            return res.status(400).json({ 
                success: false,
                message: 'Método de entrega e confirmação são obrigatórios.' 
            });
        }

        // Preparar payload para o serviço de relatórios
        const deliveryData = {
            method: deliveryMethod,          // Manter consistência com a API existente ('method' vs 'deliveryMethod')
            confirmationData: deliveryConfirmation,
            deliveredBy: req.user.id,
            deliveredAt: deliveredAt || new Date().toISOString(),
            status: status || 'delivered'
        };

        // Chamar o serviço para atualizar o status de entrega
        const updatedReport = await reportService.registerDelivery(
            accessToken, 
            reportId, 
            deliveryData
        );

        return res.status(200).json({ 
            success: true,
            message: 'Status de entrega atualizado com sucesso',
            reportId,
            report: updatedReport
        });

    } catch (error) {
        console.error('Erro ao atualizar status de entrega:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Erro ao atualizar status de entrega', 
            error: error.message 
        });
    }
});

// Rota API para gerar o PDF com as ocorrências de um aluno
router.get('/student/:studentId/occurrences/pdf', async (req, res) => {
    try {
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const { studentId } = req.params;
        const filters = req.query; // startDate, endDate, reportLevel
        const schoolId = req.user.schoolId;
        
        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        // Verificar permissões
        const allowedRoles = ['Master', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario'];
        if (!allowedRoles.includes(loggedInUser.role)) {
            return res.status(403).json({ error: 'Você não tem permissão para gerar este relatório.' });
        }

        // 1. Buscar URLs dos logos
        const logos = await mediaService.getLogosUrl(schoolId, accessToken);
        
        // 2. Gerar PDF com as ocorrências do aluno
        const pdfBuffer = await reportService.generateStudentOccurrencesReportPDF(
            accessToken, 
            studentId,
            logos,
            filters
        );

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ocorrencias-aluno-${studentId}.pdf`);
        
        return res.send(pdfBuffer);

    } catch (error) {
        console.error('Erro ao gerar PDF de ocorrências do aluno:', error);
        return res.status(500).json({ 
            message: 'Erro ao gerar PDF de ocorrências do aluno', 
            error: error.message 
        });
    }
});

module.exports = router;