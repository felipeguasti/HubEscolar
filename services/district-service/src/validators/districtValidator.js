const Joi = require('joi');

const districtSchema = Joi.object({
    name: Joi.string()
        .required()
        .min(3)
        .max(100)
        .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
        .messages({
            'string.empty': 'O nome do distrito é obrigatório',
            'string.min': 'O nome do distrito deve ter no mínimo 3 caracteres',
            'string.max': 'O nome do distrito deve ter no máximo 100 caracteres',
            'string.pattern.base': 'O nome do distrito deve conter apenas letras e espaços',
            'any.required': 'O nome do distrito é obrigatório'
        }),
    status: Joi.string()
        .valid('active', 'inactive')
        .default('active')
        .messages({
            'string.valid': 'O status deve ser "active" ou "inactive"'
        })
});

const idSchema = Joi.string()
    .pattern(/^\d+$/)
    .required()
    .messages({
        'string.pattern.base': 'O ID deve ser um número válido',
        'any.required': 'O ID é obrigatório'
    });

const validateDistrict = (data) => {
    return districtSchema.validate(data, { abortEarly: false });
};

const validateId = (id) => {
    return idSchema.validate(id);
};

module.exports = {
    validateDistrict,
    validateId
}; 