'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('reports', 'signedById');
    
    await queryInterface.addColumn('reports', 'signedBy', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nome de quem assinou o relatório'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('reports', 'signedBy');
    
    await queryInterface.addColumn('reports', 'signedById', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID do usuário que assinou o relatório'
    });
  }
};