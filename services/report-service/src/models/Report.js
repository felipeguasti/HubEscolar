const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Report extends Model {}

Report.init({
  // Sobre quem é o relatório
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID do aluno que recebeu o relatório'
  },
  studentClass: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Turma do aluno'
  },

  // Quem criou o relatório
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID do usuário que criou o relatório'
  },
  createdByRole: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Cargo/Função de quem criou o relatório'
  },

  // Conteúdo do relatório
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Conteúdo completo do relatório'
  },
  reportLevel: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nível de gravidade do relatório'
  },
  disciplinaryActIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Índice do ato disciplinar no regimento'
  },

  // Observações e Recomendações
  reportObservation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações adicionais sobre o ocorrido'
  },
  reportRecommendation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Recomendações e encaminhamentos'
  },

  // Medidas disciplinares
  suspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se o aluno foi suspenso'
  },
  suspensionDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duração da suspensão em dias'
  },

  // Reunião com responsáveis
  callParents: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se os responsáveis foram convocados'
  },
  parentsMeeting: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data e hora agendada para reunião com responsáveis'
  }
}, {
  sequelize,
  modelName: 'Report',
  tableName: 'reports',
  timestamps: true
});

module.exports = Report;