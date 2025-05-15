const Grade = require('./src/models/Grade'); // Importa o modelo Grade
const sequelize = require('../../src/config/db'); // Conexão com o banco

const turmas = [
  { name: '6ºM01', year: 2025, shift: 'Manhã', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '6ºM02', year: 2025, shift: 'Manhã', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '7ºM01', year: 2025, shift: 'Manhã', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '7ºM02', year: 2025, shift: 'Manhã', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '8ºM01', year: 2025, shift: 'Manhã', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '8ºM02', year: 2025, shift: 'Manhã', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '8ºM03', year: 2025, shift: 'Manhã', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '9ºM01', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '9ºM02', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '9ºM03', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '9ºM04', year: 2025, shift: 'Manhã', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '6ºI01', year: 2025, shift: 'Integral', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '6ºI02', year: 2025, shift: 'Integral', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '6ºI03', year: 2025, shift: 'Integral', grade: '6º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '7ºI01', year: 2025, shift: 'Integral', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '7ºI02', year: 2025, shift: 'Integral', grade: '7º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '8ºI01', year: 2025, shift: 'Integral', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '8ºI02', year: 2025, shift: 'Integral', grade: '8º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '9ºI01', year: 2025, shift: 'Integral', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' },
  { name: '9ºI02', year: 2025, shift: 'Integral', grade: '9º Ano', startDate: '2025-02-03', endDate: '2025-12-22', status: 'active' }
];

async function addGrades() {
    try {
        await sequelize.sync();
        for (const turma of turmas) {
            // Lógica para obter districtId e schoolId (substitua com sua lógica)
            const districtId = 1; // Exemplo: substitua com o ID do distrito correto
            const schoolId = 1; // Exemplo: substitua com o ID da escola correto

            await Grade.create({
                name: turma.name,
                districtId: districtId,
                schoolId: schoolId,
                year: turma.year,
                shift: turma.shift,
                startDate: turma.startDate,
                endDate: turma.endDate,
                status: turma.status,
                description: null // Ou adicione uma descrição se necessário
            });
        }
        console.log('Grades adicionadas com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar grades:', error);
    } finally {
        await sequelize.close();
    }
}

addGrades();