const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Rota de administradores funcionando!');
});

module.exports = router;