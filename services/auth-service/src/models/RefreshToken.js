// src/models/RefreshToken.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Assumindo que você tem um arquivo de configuração do Sequelize

const RefreshToken = sequelize.define('RefreshToken', {
    token: {
        type: DataTypes.STRING(256), // Tamanho adequado para um token seguro
        allowNull: false,
        unique: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users', // Nome da tabela de usuários no seu banco de dados
            key: 'id',
        },
        onDelete: 'CASCADE', // Se o usuário for excluído, os refresh tokens também serão
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
});

module.exports = RefreshToken;