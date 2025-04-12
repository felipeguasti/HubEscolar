const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../../../src/config/db');

class Grade extends Model {}

Grade.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },  
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        args: true,
        msg: 'O nome da turma é obrigatório.'
      }
    }
  },  
  districtId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Districts',
      key: 'id'
    }
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Schools',
      key: 'id'
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
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }

}, {
  sequelize,
  modelName: 'Grade',
  tableName: 'grades',
  timestamps: true
});

module.exports = Grade;