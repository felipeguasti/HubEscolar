'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sync_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      jobId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sync_jobs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      itemType: {
        type: Sequelize.ENUM('class', 'student'),
        allowNull: false
      },
      externalId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Identificador do item no sistema externo (SEGES)'
      },
      internalId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID do item no sistema interno (HubEscolar)'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nome da turma ou nome do aluno'
      },
      status: {
        type: Sequelize.ENUM('pending', 'created', 'updated', 'failed'),
        defaultValue: 'pending'
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Detalhes adicionais sobre o item'
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.dropTable('sync_items');
  }
};