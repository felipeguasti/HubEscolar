const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const SyncJob = require('./SyncJob');

const SyncItem = sequelize.define('SyncItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    jobId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: SyncJob,
            key: 'id'
        }
    },
    itemType: {
        type: DataTypes.ENUM('class', 'student'),
        allowNull: false
    },
    externalId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Identificador do item no sistema externo (SEGES)'
    },
    internalId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID do item no sistema interno (HubEscolar)'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nome da turma ou nome do aluno'
    },
    status: {
        type: DataTypes.ENUM('pending', 'created', 'updated', 'failed'),
        defaultValue: 'pending'
    },
    details: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Detalhes adicionais sobre o item'
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'sync_items',
    timestamps: true
});

// Relacionamentos
SyncJob.hasMany(SyncItem, { foreignKey: 'jobId' });
SyncItem.belongsTo(SyncJob, { foreignKey: 'jobId' });

module.exports = SyncItem;