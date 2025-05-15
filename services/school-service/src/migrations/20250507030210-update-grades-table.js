'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, find duplicate records
      const [duplicates] = await queryInterface.sequelize.query(`
        SELECT name, schoolId, year, COUNT(*) as count
        FROM grades
        GROUP BY name, schoolId, year
        HAVING count > 1
      `);

      if (duplicates.length > 0) {
        console.log('Found duplicate grades:', duplicates);
        
        // Update duplicate records to make them unique
        for (const duplicate of duplicates) {
          const [records] = await queryInterface.sequelize.query(`
            SELECT id, name, schoolId, year
            FROM grades
            WHERE name = ? AND schoolId = ? AND year = ?
            ORDER BY createdAt ASC
          `, {
            replacements: [duplicate.name, duplicate.schoolId, duplicate.year]
          });

          // Skip the first record (keep original) and update others
          for (let i = 1; i < records.length; i++) {
            const record = records[i];
            await queryInterface.sequelize.query(`
              UPDATE grades
              SET name = ?
              WHERE id = ?
            `, {
              replacements: [`${record.name}_${i}`, record.id]
            });
          }
        }
      }

      // Now proceed with creating indexes
      const [indexes] = await queryInterface.sequelize.query(
        'SHOW INDEXES FROM grades'
      );

      const existingIndexes = indexes.map(index => index.Key_name);

      // Helper function to create index if it doesn't exist
      const createIndexIfNotExists = async (indexConfig) => {
        if (!existingIndexes.includes(indexConfig.name)) {
          await queryInterface.addIndex('grades', indexConfig);
        }
      };

      // Add regular indexes first
      await createIndexIfNotExists({
        fields: ['schoolId', 'year'],
        name: 'idx_grade_school_year'
      });

      await createIndexIfNotExists({
        fields: ['districtId'],
        name: 'idx_grade_district'
      });

      await createIndexIfNotExists({
        fields: ['status'],
        name: 'idx_grade_status'
      });

      // Add unique index last
      await createIndexIfNotExists({
        unique: true,
        fields: ['name', 'schoolId', 'year'],
        name: 'idx_unique_grade_school_year'
      });

      // Check if ENUMs need to be updated
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM grades WHERE Field IN ('shift', 'status')"
      );

      const shiftColumn = columns.find(col => col.Field === 'shift');
      const statusColumn = columns.find(col => col.Field === 'status');

      // Update ENUMs only if they're different
      if (!shiftColumn?.Type.includes("'Manhã','Tarde','Noite','Integral'")) {
        await queryInterface.sequelize.query(
          "ALTER TABLE grades MODIFY COLUMN shift ENUM('Manhã', 'Tarde', 'Noite', 'Integral') NOT NULL"
        );
      }

      if (!statusColumn?.Type.includes("'active','inactive'")) {
        await queryInterface.sequelize.query(
          "ALTER TABLE grades MODIFY COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'"
        );
      }

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // No need to remove indexes that might not exist
      // Only remove the ones we know we added
      const [indexes] = await queryInterface.sequelize.query(
        'SHOW INDEXES FROM grades'
      );
      
      const existingIndexes = indexes.map(index => index.Key_name);

      for (const indexName of [
        'idx_grade_school_year',
        'idx_grade_district',
        'idx_grade_status',
        'idx_unique_grade_school_year'
      ]) {
        if (existingIndexes.includes(indexName)) {
          await queryInterface.removeIndex('grades', indexName);
        }
      }

      // Revert ENUMs to STRING type
      await queryInterface.sequelize.query(
        "ALTER TABLE grades MODIFY COLUMN shift VARCHAR(255) NOT NULL"
      );
      
      await queryInterface.sequelize.query(
        "ALTER TABLE grades MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active'"
      );

    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};