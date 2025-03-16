const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authorization');

router.get('/', authMiddleware, (req, res) => {
    res.send('Rota de dashboard funcionando!');
});

module.exports = router;