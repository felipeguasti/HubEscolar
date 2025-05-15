const Joi = require('joi');
const logger = require('../services/loggingService');
const Grade = require('../models/Grade');
const { Op } = require('sequelize');

// Schema para criação de turma
const createGrade = Joi.object({
    name: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'O nome deve ter no mínimo 3 caracteres',
            'string.max': 'O nome deve ter no máximo 100 caracteres',
            'any.required': 'O nome é obrigatório'
        }),
    schoolId: Joi.number()
        .integer()
        .required()
        .messages({
            'any.required': 'O ID da escola é obrigatório'
        }),
    districtId: Joi.number()
        .integer()
        .required()
        .messages({
            'any.required': 'O ID do distrito é obrigatório'
        }),
    year: Joi.number()
        .integer()
        .min(2000)
        .max(2100)
        .required()
        .messages({
            'number.min': 'O ano deve ser maior que 2000',
            'number.max': 'O ano deve ser menor que 2100',
            'any.required': 'O ano é obrigatório'
        }),
    shift: Joi.string()
        .valid('Manhã', 'Tarde', 'Noite', 'Integral')
        .required()
        .messages({
            'any.only': 'O turno deve ser: Manhã, Tarde, Noite ou Integral',
            'any.required': 'O turno é obrigatório'
        }),
    startDate: Joi.date()
        .required()
        .messages({
            'date.base': 'Data de início inválida',
            'any.required': 'A data de início é obrigatória'
        }),
    endDate: Joi.date()
        .allow(null)
        .messages({
            'date.base': 'Data de término inválida'
        }),
    status: Joi.string()
        .valid('active', 'inactive')
        .default('active')
        .messages({
            'any.only': 'Status inválido. Deve ser: active ou inactive'
        }),
    description: Joi.string()
        .max(500)
        .allow(null, '')
        .messages({
            'string.max': 'A descrição não pode ter mais de 500 caracteres'
        })
});

// Schema para atualização de turma
const updateGrade = Joi.object({
    name: Joi.string()
        .min(3)
        .max(100)
        .optional()
        .messages({
            'string.min': 'O nome deve ter no mínimo 3 caracteres',
            'string.max': 'O nome deve ter no máximo 100 caracteres'
        }),
    schoolId: Joi.number()
        .integer()
        .optional()
        .messages({
            'number.base': 'O ID da escola deve ser um número'
        }),
    districtId: Joi.number()
        .integer()
        .optional()
        .messages({
            'number.base': 'O ID do distrito deve ser um número'
        }),
    year: Joi.number()
        .integer()
        .min(2000)
        .max(2100)
        .optional()
        .messages({
            'number.min': 'O ano deve ser maior que 2000',
            'number.max': 'O ano deve ser menor que 2100'
        }),
    shift: Joi.string()
        .valid('Manhã', 'Tarde', 'Noite', 'Integral')
        .optional()
        .messages({
            'any.only': 'O turno deve ser: Manhã, Tarde, Noite ou Integral'
        }),
    startDate: Joi.date()
        .optional()
        .messages({
            'date.base': 'Data de início inválida'
        }),
    endDate: Joi.date()
        .allow(null)
        .optional()
        .messages({
            'date.base': 'Data de término inválida'
        }),
    status: Joi.string()
        .valid('active', 'inactive')
        .optional()
        .messages({
            'any.only': 'Status inválido. Deve ser: active ou inactive'
        }),
    description: Joi.string()
        .max(500)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'A descrição não pode ter mais de 500 caracteres'
        })
});

// Business Rules Validation
const validateGradeUniqueness = async (schoolId, name, year, gradeId = null) => {
    const whereClause = {
        schoolId,
        name,
        year
    };

    if (gradeId) {
        whereClause.id = { [Op.ne]: gradeId };
    }

    const existingGrade = await Grade.findOne({ where: whereClause });
    return existingGrade;
};

// Validation Middleware
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            if (!schema || typeof schema.validate !== 'function') {
                logger.error('Invalid validation schema', {
                    path: req.path,
                    method: req.method,
                    schemaType: schema ? typeof schema : 'undefined',
                    body: req.body
                });
                return res.status(500).json({
                    status: 'error',
                    message: 'Erro interno de validação'
                });
            }

            const { error } = await schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true
            });

            if (error) {
                const validationErrors = error.details.map(err => ({
                    field: err.path[0],
                    message: err.message.replace(/['"]/g, '')
                }));

                logger.warn('Validation failed', {
                    path: req.path,
                    method: req.method,
                    body: req.body,
                    errors: validationErrors
                });

                return res.status(400).json({
                    status: 'error',
                    message: 'Falha na validação',
                    errors: validationErrors
                });
            }

            next();
        } catch (err) {
            logger.error('Validation error', {
                path: req.path,
                method: req.method,
                error: {
                    name: err.name,
                    message: err.message,
                    stack: err.stack
                },
                body: req.body
            });

            return res.status(500).json({
                status: 'error',
                message: 'Erro interno durante validação'
            });
        }
    };
};

module.exports = {
    createGrade,
    updateGrade,
    validate
};