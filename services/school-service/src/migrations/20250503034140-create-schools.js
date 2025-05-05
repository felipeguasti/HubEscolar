'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('schools', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false, // O nome é obrigatório
      },
      districtId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true, // Opcional
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true, // Opcional
      },
      state: {
        type: Sequelize.STRING,
        allowNull: true, // Opcional
      },
      cep: {
        type: Sequelize.STRING,
        allowNull: true, // Opcional
      },
      telephone: {
        type: Sequelize.STRING,
        allowNull: true, // Opcional
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'active', // Status com valor padrão
        allowNull: false, // Status é obrigatório
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('schools');
  },
};