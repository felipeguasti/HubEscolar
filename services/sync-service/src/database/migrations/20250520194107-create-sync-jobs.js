'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sync_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID do usuário que iniciou a sincronização'
      },
      jobType: {
        type: Sequelize.ENUM('classes', 'students', 'all'),
        allowNull: false,
        comment: 'Tipo de sincronização: classes (turmas), students (alunos) ou all (ambos)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      startTime: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      totalItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total de itens processados'
      },
      createdItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Itens criados com sucesso'
      },
      updatedItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Itens atualizados'
      },
      failedItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Itens com erro'
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro, se houver'
      },
      result: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Resultado detalhado da sincronização'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sync_jobs');
  }
};