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

module.exports = router;