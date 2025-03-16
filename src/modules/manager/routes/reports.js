const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Rota de relatórios funcionando!');
});

module.exports = router;