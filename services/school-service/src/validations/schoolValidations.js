const { body, param, query } = require('express-validator');

const createSchoolValidation = [
  body('name')
    .notEmpty()
    .withMessage('O nome da escola é obrigatório.')
    .isString()
    .withMessage('O nome da escola deve ser uma string.'),
  body('districtId')
    .notEmpty()
    .withMessage('O ID do distrito é obrigatório.')
    .isInt({ min: 1 })
    .withMessage('O ID do distrito deve ser um número inteiro positivo.'),
  body('address')
    .optional()
    .isString()
    .withMessage('O endereço deve ser uma string.'),
  body('city')
    .optional()
    .isString()
    .withMessage('A cidade deve ser uma string.'),
  body('state')
    .optional()
    .isString()
    .withMessage('O estado deve ser uma string.'),
  body('cep')
    .optional()
    .isString()
    .withMessage('O CEP deve ser uma string.'),
  body('telephone')
    .optional()
    .isString()
    .withMessage('O telefone deve ser uma string.'),
  body('status')
    .notEmpty()
    .withMessage('O status é obrigatório.')
    .isIn(['active', 'inactive'])
    .withMessage('O status deve ser "active" ou "inactive".'),
];

const updateSchoolValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('O ID da escola deve ser um número inteiro positivo.'),
  body('name')
    .optional()
    .isString()
    .withMessage('O nome da escola deve ser uma string.'),
  body('districtId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('O ID do distrito deve ser um número inteiro positivo.'),
  body('address')
    .optional()
    .isString()
    .withMessage('O endereço deve ser uma string.'),
  body('city')
    .optional()
    .isString()
    .withMessage('A cidade deve ser uma string.'),
  body('state')
    .optional()
    .isString()
    .withMessage('O estado deve ser uma string.'),
  body('cep')
    .optional()
    .isString()
    .withMessage('O CEP deve ser uma string.'),
  body('telephone')
    .optional()
    .isString()
    .withMessage('O telefone deve ser uma string.'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('O status deve ser "active" ou "inactive".'),
];

const getSchoolByIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('O ID da escola deve ser um número inteiro positivo.'),
];

const getAllSchoolValidation = [
  query('districtId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('O ID do distrito para filtro deve ser um número inteiro positivo.'),
];

const deleteSchoolValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('O ID da escola a ser excluída deve ser um número inteiro positivo.'),
];

module.exports = {
  createSchoolValidation,
  updateSchoolValidation,
  getSchoolByIdValidation,
  getAllSchoolValidation,
  deleteSchoolValidation,
};