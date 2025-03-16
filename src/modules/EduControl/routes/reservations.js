// src/modules/EduControl/routes/reservations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middlewares/auth'); // Importando o middleware

router.get('/reservations', authMiddleware, (req, res) => {
  // Rota protegida, acessível apenas com token JWT válido
  res.json({ message: 'Acesso autorizado à área de reservas' });
});

module.exports = router;
