'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE features 
      CONVERT TO CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE features 
      CONVERT TO CHARACTER SET utf8 
      COLLATE utf8_general_ci;
    `);
  }
};