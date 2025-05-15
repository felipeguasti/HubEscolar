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

      // 1. Update ENUM types
      await queryInterface.sequelize.query(`
        ALTER TABLE grades 
        MODIFY COLUMN shift ENUM('Manhã', 'Tarde', 'Noite', 'Integral') 
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE grades 
        MODIFY COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
      `);

      // 2. Update foreign key for School if it doesn't exist
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

      // 3. Add or update indexes
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

  async down(queryInterface, Sequelize) {
    try {
      // 1. Remove indexes
      const removeIndexIfExists = async (indexName) => {
        try {
          await queryInterface.removeIndex('grades', indexName);
        } catch (error) {
          console.log(`Index ${indexName} removal skipped:`, error.message);
        }
      };

      await removeIndexIfExists('idx_grade_school_year');
      await removeIndexIfExists('idx_grade_district');
      await removeIndexIfExists('idx_grade_status');
      await removeIndexIfExists('idx_unique_grade_school_year');

      // 2. Remove foreign key if exists
      await queryInterface.sequelize.query(`
        ALTER TABLE grades
        DROP FOREIGN KEY IF EXISTS fk_grade_school
      `);

      // 3. Revert ENUM columns to VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE grades 
        MODIFY COLUMN shift VARCHAR(255) 
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE grades 
        MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active'
      `);

    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};