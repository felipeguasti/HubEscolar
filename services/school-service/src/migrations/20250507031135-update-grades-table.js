'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Helper to check if foreign key exists
      const checkForeignKeyExists = async (constraintName) => {
        const [constraints] = await queryInterface.sequelize.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.TABLE_CONSTRAINTS 
          WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'grades' 
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
          AND CONSTRAINT_NAME = ?
        `, { replacements: [constraintName] });
        
        return constraints.length > 0;
      };

      // First, ensure we have the ENUM types
      await queryInterface.sequelize.query(`
        ALTER TABLE grades 
        MODIFY COLUMN shift ENUM('Manhã', 'Tarde', 'Noite', 'Integral') NOT NULL,
        MODIFY COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
      `);

      // Add foreign key constraints if they don't exist
      const schoolFkExists = await checkForeignKeyExists('fk_grade_school');
      if (!schoolFkExists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE grades
          ADD CONSTRAINT fk_grade_school
          FOREIGN KEY (schoolId) REFERENCES schools(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `);
      }

      const districtFkExists = await checkForeignKeyExists('fk_grade_district');
      if (!districtFkExists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE grades
          ADD CONSTRAINT fk_grade_district
          FOREIGN KEY (districtId) REFERENCES districts(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `);
      }

      // Add indexes if they don't exist
      const addIndexIfNotExists = async (indexName, fields, isUnique = false) => {
        try {
          const [indexes] = await queryInterface.sequelize.query(
            'SHOW INDEX FROM grades WHERE Key_name = ?',
            { replacements: [indexName] }
          );

          if (indexes.length === 0) {
            await queryInterface.addIndex('grades', {
              fields,
              name: indexName,
              unique: isUnique
            });
          }
        } catch (error) {
          console.log(`Index ${indexName} creation skipped:`, error.message);
        }
      };

      await addIndexIfNotExists('idx_grade_school_year', ['schoolId', 'year']);
      await addIndexIfNotExists('idx_grade_district', ['districtId']);
      await addIndexIfNotExists('idx_grade_status', ['status']);
      await addIndexIfNotExists('idx_unique_grade_school_year', ['name', 'schoolId', 'year'], true);

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  // ...existing down code...
};