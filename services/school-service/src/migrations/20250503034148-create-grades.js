'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('grades', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true, // O nome da turma é obrigatório
        },
      },
      districtId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Districts', // Nome da tabela referenciada
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Schools', // Nome da tabela referenciada
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          isInt: true, // O ano letivo deve ser um número inteiro
        },
      },
      shift: {
        type: Sequelize.ENUM('Manhã', 'Tarde', 'Noite', 'Integral'),
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.dropTable('grades');
  },
};