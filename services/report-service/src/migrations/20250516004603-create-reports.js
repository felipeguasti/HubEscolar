'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID do aluno que recebeu o relatório'
      },
      studentClass: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Turma do aluno'
      },
      createdById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID do usuário que criou o relatório'
      },
      createdByRole: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Cargo/Função de quem criou o relatório'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Conteúdo completo do relatório'
      },
      reportLevel: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nível de gravidade do relatório'
      },
      disciplinaryActIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Índice do ato disciplinar no regimento'
      },
      reportObservation: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Observações adicionais sobre o ocorrido'
      },
      reportRecommendation: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Recomendações e encaminhamentos'
      },
      suspended: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Indica se o aluno foi suspenso'
      },
      suspensionDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duração da suspensão em dias'
      },
      callParents: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Indica se os responsáveis foram convocados'
      },
      parentsMeeting: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data e hora agendada para reunião com responsáveis'
      },
      status: {
        type: Sequelize.ENUM('pending', 'delivered', 'archived'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Status atual do relatório (pendente, entregue, arquivado)'
      },
      deliveredAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data e hora em que o relatório foi entregue'
      },
      deliveredBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID do usuário que registrou a entrega'
      },
      deliveryMethod: {
        type: Sequelize.ENUM('print', 'email', 'whatsapp'),
        allowNull: true,
        comment: 'Método usado para entregar o relatório'
      },
      deliveryConfirmation: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Protocolo ou confirmação de entrega (número WhatsApp, email, etc)'
      },
      parentResponse: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Resposta ou observação dos responsáveis'
      },
      signedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data e hora em que o relatório foi assinado'
      },
      signedBy: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nome de quem assinou o relatório'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reports');
  }
};