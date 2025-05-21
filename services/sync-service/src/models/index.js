const sequelize = require('../config/db');
const SyncJob = require('./SyncJob');
const SyncItem = require('./SyncItem');
const logger = require('../utils/logger');

// Estabelecer relacionamentos entre os modelos
SyncJob.hasMany(SyncItem, { foreignKey: 'jobId' });
SyncItem.belongsTo(SyncJob, { foreignKey: 'jobId' });

// Função para sincronizar modelos com o banco de dados
async function syncModels() {
  try {
    await sequelize.sync({ alter: false });
    logger.info('Modelos de sincronização sincronizados com o banco de dados');
  } catch (error) {
    logger.error('Erro ao sincronizar modelos com o banco de dados:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  SyncJob,
  SyncItem,
  syncModels
};