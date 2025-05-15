'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add indexes
    await queryInterface.addIndex('grades', ['schoolId', 'year'], {
      name: 'idx_grade_school_year'
    });

    await queryInterface.addIndex('grades', ['districtId'], {
      name: 'idx_grade_district'
    });

    await queryInterface.addIndex('grades', ['status'], {
      name: 'idx_grade_status'
    });

    // Add foreign key constraints if they don't exist
    await queryInterface.addConstraint('grades', {
      fields: ['schoolId'],
      type: 'foreign key',
      name: 'fk_grade_school',
      references: {
        table: 'schools',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('grades', {
      fields: ['districtId'],
      type: 'foreign key',
      name: 'fk_grade_district',
      references: {
        table: 'districts',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('grades', 'idx_grade_school_year');
    await queryInterface.removeIndex('grades', 'idx_grade_district');
    await queryInterface.removeIndex('grades', 'idx_grade_status');

    // Remove foreign key constraints
    await queryInterface.removeConstraint('grades', 'fk_grade_school');
    await queryInterface.removeConstraint('grades', 'fk_grade_district');
  }
};