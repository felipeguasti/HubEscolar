import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Feature } from './Feature.js';

export const UserFeature = sequelize.define('UserFeature', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    feature_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'features',
            key: 'id'
        }
    },
    granted_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false
    }
}, {
    tableName: 'user_features',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
UserFeature.associate = (models) => {
    UserFeature.belongsTo(Feature, { 
        foreignKey: 'feature_id',
        as: 'feature'
    });
};

export default UserFeature;