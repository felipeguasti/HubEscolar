import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Feature = sequelize.define('Feature', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    description: {
        type: DataTypes.TEXT({
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }),
        allowNull: true
    },
    route: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            is: /^[a-zA-Z0-9\-\/]+$/
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false
    }
}, {
    tableName: 'features',
    timestamps: true,
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

// Add association after model definition
Feature.associate = (models) => {
    Feature.hasMany(models.UserFeature, {
        foreignKey: 'feature_id',
        as: 'userFeatures'
    });
};

export default Feature;