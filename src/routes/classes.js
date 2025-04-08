const express = require('express');
const router = express.Router();
const classesController = require('../controllers/classesController');

router.get('/turnos', classesController.getTurnos);
router.get('/:turno', classesController.getClassesByTurno);

module.exports = router;
