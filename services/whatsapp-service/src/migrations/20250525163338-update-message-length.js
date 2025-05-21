'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('messages', 'message', {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10000]
      }
    });
    
    console.log('Migration: Aumentado o limite de caracteres do campo message para 10000');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('messages', 'message', {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000] // Reverter para o limite anterior
      }
    });
    
    console.log('Migration: Revertida alteração do limite de caracteres do campo message');
  }
};