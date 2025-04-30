'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('headers', 'line1', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'First line of header (e.g. Custom text)'
    });

    await queryInterface.addColumn('headers', 'line2', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Second line of header (e.g. Custom text)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('headers', 'line1');
    await queryInterface.removeColumn('headers', 'line2');
  }
};