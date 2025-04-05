const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Log = sequelize.define('Log', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    service: {
        type: DataTypes.STRING,
        allowNull: false
    },
    level: {
        type: DataTypes.ENUM('error', 'warn', 'info', 'debug'),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    operation: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'logs',
    timestamps: false,
    indexes: [
        {
            fields: ['timestamp']
        },
        {
            fields: ['level']
        },
        {
            fields: ['userId']
        }
    ]
});

module.exports = Log; 