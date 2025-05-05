const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            is: /^\+?[1-9]\d{1,14}$/
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 1000]
        }
    },
    type: {
        type: DataTypes.ENUM('sent', 'received'),
        allowNull: false,
        defaultValue: 'sent'
    },
    status: {
        type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'messages',
    timestamps: true,
    indexes: [
        {
            fields: ['phone']
        },
        {
            fields: ['status']
        },
        {
            fields: ['timestamp']
        }
    ]
});

Message.sync();

module.exports = Message;