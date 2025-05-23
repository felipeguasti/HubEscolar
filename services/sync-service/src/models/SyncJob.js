const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SyncJob = sequelize.define('SyncJob', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    schoolId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID do usuário que iniciou a sincronização'
    },
    jobType: {
        type: DataTypes.ENUM('classes', 'students', 'all'),
        allowNull: false,
        comment: 'Tipo de sincronização: classes (turmas), students (alunos) ou all (ambos)'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending'
    },
    startTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    totalItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total de itens processados'
    },
    createdItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Itens criados com sucesso'
    },
    updatedItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Itens atualizados'
    },
    failedItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Itens com erro'
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro, se houver'
    },
    result: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Resultado detalhado da sincronização'
    }
}, {
    tableName: 'sync_jobs',
    timestamps: true
});

module.exports = SyncJob;