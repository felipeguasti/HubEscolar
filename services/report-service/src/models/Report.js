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
  },

  // Status do relatório
  status: {
    type: DataTypes.ENUM('pending', 'delivered', 'archived'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Status atual do relatório (pendente, entregue, arquivado)'
  },

  // Entrega
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data e hora em que o relatório foi entregue'
  },
  deliveredBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID do usuário que registrou a entrega'
  },
  deliveryMethod: {
    type: DataTypes.ENUM('print', 'email', 'whatsapp'),
    allowNull: true,
    comment: 'Método usado para entregar o relatório'
  },
  deliveryConfirmation: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Protocolo ou confirmação de entrega (número WhatsApp, email, etc)'
  }, 
  parentResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Resposta ou observação dos responsáveis'
  },

  // Assinatura
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data e hora em que o relatório foi assinado'
  },
  signedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nome de quem assinou o relatório'
  }
}, {
  sequelize,
  modelName: 'Report',
  tableName: 'reports',
  timestamps: true
});

module.exports = Report;