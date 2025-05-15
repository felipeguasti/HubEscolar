// src/routes/reportRoutes.js
const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Rota protegida para criar um relatório com IA
router.post('/create', authMiddleware, reportController.createReport);

// Rota protegida para criar um relatório MANUAL
router.post('/create/manual', authMiddleware, reportController.createManualReport);

// Nova rota para exclusão de relatório
router.delete('/delete/:id', authMiddleware, reportController.deleteReport);

// Rota para listar relatórios com filtros
router.get('/list', authMiddleware, reportController.listReports);

router.get('/disciplinary-options', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', '..', 'faltas_disciplinares.json');
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        const disciplinaryOptions = {
            leves: [],
            graves: [],
            infracionais: []
        };

        if (data && data.atos_indisciplinares) {
            for (const level in data.atos_indisciplinares) {
                if (data.atos_indisciplinares.hasOwnProperty(level)) {
                    const acts = data.atos_indisciplinares[level];
                    acts.forEach((act, actIndex) => {
                        if (act.reportContentOptions && Array.isArray(act.reportContentOptions)) {
                            const levelKey = level.toLowerCase();
                            if (disciplinaryOptions.hasOwnProperty(levelKey)) {
                                act.reportContentOptions.forEach(option => {
                                    disciplinaryOptions[levelKey].push({
                                        actIndex: actIndex,
                                        text: option
                                    });
                                });
                            }
                        }
                    });
                }
            }
        }

        res.status(200).json(disciplinaryOptions);
    } catch (error) {
        console.error('Erro ao ler/parsear faltas_disciplinares.json:', error);
        res.status(500).json({ message: 'Erro ao carregar as opções de faltas disciplinares.' });
    }
});

// Rota para gerar PDF do relatório
router.get('/:id/print', authMiddleware, async (req, res) => {
    try {
        const reportId = req.params.id;
        const authToken = req.headers.authorization?.split(' ')[1];
        
        // Pegando as URLs dos logos do query params
        const logos = {  // Criando objeto nomeado
            schoolLogo: req.query.schoolLogo,
            districtLogo: req.query.districtLogo
        };

        console.log('Logos recebidos:', logos); // Debug: Verificando os logos recebidos

        // Passando toda a requisição + URLs para o controller
        const pdfBuffer = await reportController.generateReportPDF(
            reportId, 
            req.user, 
            authToken,
            logos
        );
    
        
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

// Rota para registrar entrega do relatório
router.post('/:id/deliver', authMiddleware, async (req, res) => {
    try {
        const reportId = req.params.id;
        const deliveryData = {
            method: req.body.method,
            parentResponse: req.body.parentResponse,
            signedBy: req.body.signedBy,
            signedAt: req.body.signedAt,
            deliveredBy: req.user.id,
            deliveredAt: new Date(),
        };

        await reportController.registerDelivery(reportId, deliveryData);
        
        res.status(200).json({
            message: 'Entrega registrada com sucesso',
            reportId
        });
    } catch (error) {
        console.error('Erro ao registrar entrega:', error);
        res.status(500).json({ 
            message: 'Erro ao registrar entrega', 
            error: error.message 
        });
    }
});

module.exports = router;