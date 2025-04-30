'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if feature already exists
      const existingFeature = await queryInterface.sequelize.query(
        'SELECT * FROM features WHERE name = ?',
        {
          replacements: ['Relatórios'],
          type: Sequelize.QueryTypes.SELECT
        }
      );

      // If feature doesn't exist, create it
      if (existingFeature.length === 0) {
        const features = [{
          name: 'Relatórios',
          description: 'Permite criar, editar e visualizar relatórios disciplinares e pedagógicos no sistema. Inclui geração automática via IA e opção de criação manual.',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }];

        await queryInterface.sequelize.query(`
          INSERT INTO features (name, description, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `, {
          replacements: [
            features[0].name,
            features[0].description,
            features[0].status,
            features[0].created_at,
            features[0].updated_at
          ],
          type: Sequelize.QueryTypes.INSERT
        });
        
        console.log('Feature "Relatórios" created successfully');
      } else {
        console.log('Feature "Relatórios" already exists, skipping...');
      }
    } catch (error) {
      console.error('Seed error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('features', {
      name: 'Relatórios'
    }, {});
  }
};