const Turma = require('./src/models/Turma'); // Importa o modelo Turma
const sequelize = require('./src/config/db'); // Conexão com o banco

const turmas = [
    { name: '6ºM01', year: 2025, shift: 'Manhã', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '6ºM02', year: 2025, shift: 'Manhã', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '7ºM01', year: 2025, shift: 'Manhã', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '7ºM02', year: 2025, shift: 'Manhã', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '8ºM01', year: 2025, shift: 'Manhã', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '8ºM02', year: 2025, shift: 'Manhã', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '8ºM03', year: 2025, shift: 'Manhã', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '9ºM01', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '9ºM02', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '9ºM03', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '9ºM04', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '6ºI01', year: 2025, shift: 'Integral', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '6ºI02', year: 2025, shift: 'Integral', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '6ºI03', year: 2025, shift: 'Integral', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '7ºI01', year: 2025, shift: 'Integral', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '7ºI02', year: 2025, shift: 'Integral', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '8ºI01', year: 2025, shift: 'Integral', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '8ºI02', year: 2025, shift: 'Integral', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '9ºI01', year: 2025, shift: 'Integral', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' },
    { name: '9ºI02', year: 2025, shift: 'Integral', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'Ativa' }
  ];

async function addTurmas() {
  try {
    await sequelize.sync(); // Garante que a conexão com o banco está ativa
    await Turma.bulkCreate(turmas); // Insere todas as turmas de uma vez
    console.log('Turmas adicionadas com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar turmas:', error);
  } finally {
    await sequelize.close(); // Fecha a conexão com o banco
  }
}

addTurmas();
