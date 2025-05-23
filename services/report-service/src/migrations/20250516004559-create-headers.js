'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('headers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      districtId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      schoolLogo: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Path to school logo image'
      },
      districtLogo: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Path to district logo image'
      },
      line1: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'First line of header (e.g. Custom text)'
      },
      line2: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Second line of header (e.g. Custom text)'
      },
      cachedSchoolName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cachedDistrictName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cachedState: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cachedAddress: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Full formatted address including phone'
      },
      lastCacheUpdate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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
    await queryInterface.dropTable('headers');
  }
};