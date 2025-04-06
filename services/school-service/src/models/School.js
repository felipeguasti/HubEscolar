const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const School = sequelize.define('School', {
  name: {
    type: DataTypes.STRING,
    allowNull: false, // O nome é obrigatório
  },
  districtId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true, // Opcional
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true, // Opcional
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true, // Opcional
  },
  cep: {
    type: DataTypes.STRING,
    allowNull: true, // Opcional
  },
  telephone: {
    type: DataTypes.STRING,
    allowNull: true, // Opcional
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active', // Status com valor padrão
    allowNull: false, // Status é obrigatório
  }
}, {
  tableName: 'schools', // Nome da tabela
  timestamps: true, // Cria os campos createdAt e updatedAt automaticamente
});

School.associate = (models) => {
  School.hasMany(models.User, { foreignKey: 'schoolId' });
};

// Exporta o modelo diretamente
module.exports = School;
