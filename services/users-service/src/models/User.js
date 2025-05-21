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
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      args: true,
      msg: 'Este nome de usuário já está em uso.'
    },
    validate: {
      len: {
        args: [3, 30],
        msg: 'Nome de usuário deve ter entre 3 e 30 caracteres.'
      },
      is: {
        args: /^[a-zA-Z0-9._-]+$/i,
        msg: 'Nome de usuário pode conter apenas letras, números, pontos, traços e sublinhados.'
      }
    }
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
    defaultValue: 'Integral',
    allowNull: true
  },

  // Dados Acadêmicos/Profissionais
  content: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gradeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Id da turma do aluno - referência ao microserviço school-service'
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

User.associate = (models) => {
  User.belongsTo(models.District, { foreignKey: 'districtId', as: 'district' });
  User.belongsTo(models.School, { foreignKey: 'schoolId', as: 'school' });
};

module.exports = User;
