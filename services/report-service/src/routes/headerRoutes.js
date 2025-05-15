const express = require('express');
const router = express.Router();
const headerService = require('../services/headerService');
const authMiddleware = require('../middlewares/auth');

// Get or create header
router.get('/:schoolId', authMiddleware, async (req, res) => {
    try {
        const header = await headerService.getOrCreateHeader(
            req.params.schoolId,
            req.headers.authorization?.split(' ')[1]
        );
        res.json(header);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or update header
router.post('/update', authMiddleware, async (req, res) => {
    try {
        console.log('Received update request:', req.body);

        const headerData = {
            schoolId: req.body.schoolId,
            districtId: req.body.districtId,
            schoolLogo: req.body.schoolLogo,      // Already a path from frontend
            districtLogo: req.body.districtLogo,  // Already a path from frontend
            line1: req.body.line1,               // Add line1 field
            line2: req.body.line2,               // Add line2 field
            authToken: req.headers.authorization?.split(' ')[1]
        };

        console.log('Processing header update with:', headerData);

        const header = await headerService.updateHeader(headerData);
        res.json(header);
    } catch (error) {
        console.error('Error updating header:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete header
router.delete('/delete/:schoolId', authMiddleware, async (req, res) => {
    try {
        await headerService.deleteHeader(req.params.schoolId);
        res.json({ message: 'Cabeçalho deletado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all headers
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const headers = await headerService.listHeaders();
        res.json(headers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;