'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          is: /^\+?[1-9]\d{1,14}$/, // Validação de número de telefone
        },
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 1000], // Limite de caracteres
        },
      },
      type: {
        type: Sequelize.ENUM('sent', 'received'),
        allowNull: false,
        defaultValue: 'sent',
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      metadata: {
        type: Sequelize.JSON, // Alterado de JSONB para JSON
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Adicionar índices
    await queryInterface.addIndex('messages', ['phone']);
    await queryInterface.addIndex('messages', ['status']);
    await queryInterface.addIndex('messages', ['timestamp']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('messages');
  },
};