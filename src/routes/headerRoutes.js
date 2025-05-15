const express = require('express');
const router = express.Router();
const axios = require('axios');
const headerService = require('../services/headerService');
const isAuthenticated = require('../middlewares/auth');
const upload = require('../config/multerConfig');

const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL;

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        if (!['Diretor', 'Secretario'].includes(loggedInUser.role)) {
            return res.status(403).send('Acesso não autorizado');
        }

        // Buscar dados do cabeçalho existente
        const existingHeader = await headerService.getHeader(
            accessToken, 
            loggedInUser.schoolId
        );

        // Preparar dados para o template
        const headerData = existingHeader ? {
            schoolLogo: existingHeader.schoolLogo,
            districtLogo: existingHeader.districtLogo,
            line1: existingHeader.line1,
            line2: existingHeader.line2,
            id: existingHeader.id
        } : null;

        console.log('Header data being sent to template:', headerData);

        res.render('reports/admin', {
            title: 'Administração de Cabeçalhos',
            user: loggedInUser,
            header: headerData
        });
    } catch (error) {
        console.error('Erro ao carregar página de cabeçalhos:', error);
        res.status(500).send('Erro ao carregar página de cabeçalhos');
    }
});

// Rota para criar/atualizar cabeçalho
router.post('/update', upload.fields([
    { name: 'schoolLogo', maxCount: 1 },
    { name: 'districtLogo', maxCount: 1 }
]), async (req, res) => {
    try {
        const loggedInUser = req.user;
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        console.log('Form data received:', req.body);

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        const headerData = {
            schoolId: loggedInUser.schoolId,
            districtId: loggedInUser.districtId,
            schoolLogo: req.files?.schoolLogo ? `/medias/uploads/${req.files.schoolLogo[0].filename}` : undefined,
            districtLogo: req.files?.districtLogo ? `/medias/uploads/${req.files.districtLogo[0].filename}` : undefined,
            line1: req.body.line1, // Add line1
            line2: req.body.line2, // Add line2
        };

        console.log('Sending to microservice:', headerData);

        const response = await axios.post(
            `${REPORT_SERVICE_URL}/headers/update`,
            headerData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Microservice response:', response.data); // Debug log

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Erro ao atualizar cabeçalho:', error);
        return res.status(500).json({ 
            message: 'Erro ao atualizar cabeçalho', 
            error: error.message 
        });
    }
});

// Rota para deletar um cabeçalho
router.delete("/delete/:schoolId", async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const { schoolId } = req.params;
        const loggedInUser = req.user;

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        // Apenas Diretor e Secretário podem deletar
        if (!['Diretor', 'Secretario'].includes(loggedInUser.role)) {
            return res.status(403).json({ error: 'Sem permissão para deletar cabeçalho.' });
        }

        await headerService.deleteHeader(accessToken, schoolId);
        return res.status(200).json({ message: 'Cabeçalho deletado com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar cabeçalho:', error);
        return res.status(500).json({ 
            message: 'Erro ao deletar cabeçalho', 
            error: error.message 
        });
    }
});

// Rota para buscar cabeçalho por schoolId
router.get('/:schoolId', async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const { schoolId } = req.params;

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de autorização não fornecido.' });
        }

        const header = await headerService.getHeader(accessToken, schoolId);
        return res.status(200).json(header);
    } catch (error) {
        console.error('Erro ao buscar cabeçalho:', error);
        return res.status(500).json({ 
            message: 'Erro ao buscar cabeçalho', 
            error: error.message 
        });
    }
});

// Rota para upload de logo
router.post('/upload-logo', async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
        const { schoolId, logoType } = req.body; // logoType: 'school' ou 'district'
        
        if (!req.files || !req.files.logo) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const logo = await headerService.uploadLogo(accessToken, schoolId, logoType, req.files.logo);
        return res.status(200).json(logo);
    } catch (error) {
        console.error('Erro ao fazer upload de logo:', error);
        return res.status(500).json({ 
            message: 'Erro ao fazer upload de logo', 
            error: error.message 
        });
    }
});

module.exports = router;