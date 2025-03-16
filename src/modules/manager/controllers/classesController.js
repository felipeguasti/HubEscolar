const { Op } = require('sequelize');
const Turma = require('../../../models/Turma'); // Teste com um nível a mais

exports.getClassesByTurno = async (req, res) => {
    try {
        const { turno } = req.params;
        if (!turno) {
            return res.status(400).json({ error: 'O parâmetro turno é obrigatório.' });
        }
        const turmas = await Turma.findAll({
            where: { shift: turno } 
        });
        res.json(turmas);
    } catch (error) {
        console.error('Erro ao buscar turmas:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
exports.getTurnos = async (req, res) => {
    try {
        console.log('Buscando turnos únicos...');

        const turnos = await Turma.findAll({
            attributes: ['shift'],
            group: ['shift'],
            order: [['shift', 'ASC']],
            raw: true
        });

        console.log('Turnos brutos do DB:', turnos);

        const turnosArray = turnos.map(t => t.shift);

        console.log('Turnos extraídos:', turnosArray);
        res.json(turnosArray);
    } catch (error) {
        console.error('Erro ao buscar turnos:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
