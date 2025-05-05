'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('headers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
      },
      districtId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      schoolLogo: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Path to school logo image',
      },
      districtLogo: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Path to district logo image',
      },
      line1: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'First line of header (e.g. Custom text)',
      },
      line2: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Second line of header (e.g. Custom text)',
      },
      cachedSchoolName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cachedDistrictName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cachedState: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cachedAddress: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Full formatted address including phone',
      },
      lastCacheUpdate: {
        type: Sequelize.DATE,
        allowNull: false,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('headers');
  },
};