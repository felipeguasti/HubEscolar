const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');
const School = require('./School');

class Grade extends Model {
    static associate() {
        // Only associate with School
        Grade.belongsTo(School, {
            foreignKey: 'schoolId',
            as: 'school',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    }

    static async findBySchool(schoolId) {
        try {
            return await this.findAll({
                where: { 
                    schoolId
                },
                include: [
                    {
                        association: 'school',
                        attributes: ['name']
                    }
                ],
                order: [['year', 'DESC'], ['name', 'ASC']]
            });
        } catch (error) {
            console.error('Error in findBySchool:', error);
            throw new Error('Failed to fetch grades by school');
        }
    }

    static async findActiveByDistrict(districtId) {
        return this.findAll({
            where: { 
                districtId, 
                status: 'active' 
            },
            include: [
                {
                    association: 'school',
                    attributes: ['name']
                }
            ],
            order: [['schoolId', 'ASC'], ['year', 'DESC'], ['name', 'ASC']]
        });
    }

    // Simplified findAllWithDetails
    static async findAllWithDetails() {
        return this.findAll({
            include: [
                {
                    association: 'school',
                    attributes: ['name']
                }
            ],
            order: [['year', 'DESC'], ['name', 'ASC']]
        });
    }

    // Método de instância para verificar se a turma está ativa
    isActive() {
        return this.status === 'active';
    }

    // Add this after your static methods
    toJSON() {
        const values = { ...this.get() };
        return {
            ...values,
            schoolName: this.school?.name || null
        };
    }

    static async findByDistrict(districtId) {
        return this.findAll({
            where: { 
                districtId
            },
            include: [
                {
                    association: 'school',
                    attributes: ['name']
                }
            ],
            order: [['schoolId', 'ASC'], ['year', 'DESC'], ['name', 'ASC']]
        });
    }
}

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
            },
            len: {
                args: [3, 100],
                msg: 'O nome da turma deve ter entre 3 e 100 caracteres.'
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
            },
            min: {
                args: [2000],
                msg: 'O ano letivo deve ser maior que 2000.'
            },
            max: {
                args: [2100],
                msg: 'O ano letivo não pode ser maior que 2100.'
            }
        }
    },
    shift: {
        type: DataTypes.ENUM('Manhã', 'Tarde', 'Noite', 'Integral'),
        allowNull: false,
        validate: {
            isIn: {
                args: [['Manhã', 'Tarde', 'Noite', 'Integral']],
                msg: 'O turno deve ser: Manhã, Tarde, Noite ou Integral.'
            }
        }
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: {
                msg: 'Data de início inválida.'
            }
        }
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
            isDate: {
                msg: 'Data de término inválida.'
            },
            isAfterStartDate(value) {
                if (value && value <= this.startDate) {
                    throw new Error('A data de término deve ser posterior à data de início.');
                }
            }
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
        validate: {
            isIn: {
                args: [['active', 'inactive']],
                msg: 'Status inválido. Deve ser: active ou inactive.'
            }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: {
                args: [0, 500],
                msg: 'A descrição não pode ter mais de 500 caracteres.'
            }
        }
    }
}, {
    sequelize,
    modelName: 'Grade',
    tableName: 'grades',
    timestamps: true,
    indexes: [
        {
            fields: ['schoolId', 'year'],
            name: 'idx_grade_school_year'
        },
        {
            fields: ['districtId'],
            name: 'idx_grade_district'
        },
        {
            fields: ['status'],
            name: 'idx_grade_status'
        },
        {
            unique: true,
            fields: ['name', 'schoolId', 'year'],
            name: 'idx_unique_grade_school_year'
        }
    ]
});

// Add after Grade.init()
Grade.addScope('active', {
    where: {
        status: 'active'
    }
});

// Initialize associations after model definition
Grade.associate();

module.exports = Grade;