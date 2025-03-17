const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

class User extends Model {
  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }
}

User.init({
  // Dados Pessoais
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      args: true,
      msg: 'Este e-mail já está em uso.'
    },
    validate: {
      isEmail: {
        args: true,
        msg: 'Por favor, insira um endereço de e-mail válido.'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cpf: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'),
    allowNull: true
  },
  profilePic: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Função e Turno
  role: {
    type: DataTypes.ENUM(
      'Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'
    ),
    allowNull: false,
    defaultValue: 'aluno'
  },
  horario: {
    type: DataTypes.ENUM('Manhã', 'Tarde', 'Noite', 'Integral'),
    defaultValue: 'Manhã',
    allowNull: false
  },

  // Dados Acadêmicos/Profissionais
  class: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'userClass'
  },
  content: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Novas entradas: Escola e Secretaria
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Id da escola do usuário'
  },
  districtId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Id da secretaria do usuário'
  },

  // Endereço
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zip: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isNumeric: {
        args: true,
        msg: 'O CEP deve conter apenas números.'
      },
      len: {
        args: [8, 8],
        msg: 'O CEP deve conter 8 caracteres.'
      }
    }
  },

  // Status do usuário
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

module.exports = User;
