'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('turmas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nome da turma'
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID da escola a que esta turma pertence'
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Ano letivo da turma'
      },
      level: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nível escolar (Fundamental, Médio, etc)'
      },
      shift: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Turno (Manhã, Tarde, Noite)'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false
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
    await queryInterface.dropTable('turmas');
  }
};