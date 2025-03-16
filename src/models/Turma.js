const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Turma extends Model {}

Turma.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },  
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        args: true,
        msg: 'O nome da turma é obrigatório.'
      }
    }
  },  
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: {
        args: true,
        msg: 'O ano letivo deve ser um número inteiro.'
      }
    }
  },
  shift: {
    type: DataTypes.ENUM('Manhã', 'Tarde', 'Noite', 'Integral'),
    allowNull: false
  },  
  grade: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Ativa', 'Finalizada', 'Cancelada'),
    allowNull: false,
    defaultValue: 'Ativa'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }

}, {
  sequelize,
  modelName: 'Turma',
  tableName: 'turmas',
  timestamps: true
});

module.exports = Turma;