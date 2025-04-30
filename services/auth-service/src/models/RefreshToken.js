import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const RefreshToken = sequelize.define('RefreshToken', {
    token: {
        type: DataTypes.STRING(256),
        allowNull: false,
        unique: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
    },
}, {
    tableName: 'refresh_tokens',
    timestamps: true
});