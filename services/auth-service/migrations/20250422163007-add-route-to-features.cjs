'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('features', 'route', {
            type: Sequelize.STRING(100),
            allowNull: false,
            unique: true,
            defaultValue: '/features/default',
            validate: {
                notEmpty: true,
                is: /^[a-zA-Z0-9\-\/]+$/
            }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('features', 'route');
    }
};