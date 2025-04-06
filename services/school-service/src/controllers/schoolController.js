const School = require('../models/School');
const axios = require('axios');
const { validate } = require('../services/validationService');
const {
  createSchoolValidation,
  updateSchoolValidation,
  getSchoolByIdValidation,
  getAllSchoolValidation,
  deleteSchoolValidation,
} = require('../validations/schoolValidations');
const { handleServiceError } = require('../services/errorHandlingService');
const logger = require('../services/loggingService');

// Configuração padrão do timeout para as chamadas axios (em ms)
const AXIOS_TIMEOUT = 5000; // 5 segundos

exports.createSchool = [
  validate(createSchoolValidation),
  async (req, res) => {
    if (!req.user || (req.user.role !== "Master" && req.user.role !== "Inspetor")) {
      logger.warn(`Acesso negado para usuário ${req.user ? req.user.id : 'não autenticado'} com role ${req.user ? req.user.role : 'desconhecida'} ao tentar criar uma escola.`);
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { name, districtId, address, city, state, cep, telephone, status } = req.body;

    try {
      const districtServiceUrl = process.env.DISTRICT_SERVICE_URL;
      if (!districtServiceUrl) {
        logger.error("Variável de ambiente DISTRICT_SERVICE_URL não configurada.");
        return handleServiceError(res, new Error("Erro de configuração do serviço."), "Erro ao criar a escola.", 500);
      }

      try {
        const districtResponse = await axios.get(`${districtServiceUrl}/${districtId}`, { timeout: AXIOS_TIMEOUT });
        if (!districtResponse.data) {
          return res.status(400).json({ error: "Distrito não encontrado." });
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          logger.error(`Timeout ao verificar o distrito ${districtId}: ${error.message}`);
          return res.status(504).json({ error: "Timeout ao verificar o distrito." });
        }
        if (error.response && error.response.status === 404) {
          return res.status(400).json({ error: "Distrito não encontrado." });
        }
        logger.error("Erro ao verificar o distrito:", error.message);
        return handleServiceError(res, error, "Erro ao verificar o distrito.", 500);
      }

      const existingSchool = await School.findOne({ where: { name, districtId: districtId } });
      if (existingSchool) {
        return res.status(400).json({ error: "Já existe uma escola com este nome neste distrito." });
      }

      const school = await School.create({
        name,
        districtId,
        address,
        city,
        state,
        cep,
        telephone,
        status,
      });

      logger.info(`Escola criada com sucesso: ${school.id} - ${school.name} por usuário ${req.user ? req.user.id : 'desconhecido'}`);
      res.status(201).json({ message: "Escola criada com sucesso!", school });
    } catch (err) {
      logger.error('Erro ao criar escola:', err);
      return handleServiceError(res, err, "Erro ao criar a escola.", 500);
    }
  },
];

exports.getAllSchool = [
  validate(getAllSchoolValidation),
  async (req, res) => {
    try {
      const { districtId } = req.query;
      let schools;

      if (districtId) {
        const districtServiceUrl = process.env.DISTRICT_SERVICE_URL;
        if (!districtServiceUrl) {
          logger.error("Variável de ambiente DISTRICT_SERVICE_URL não configurada.");
          return handleServiceError(res, new Error("Erro de configuração do serviço."), "Erro ao buscar escolas.", 500);
        }

        try {
          const districtResponse = await axios.get(`${districtServiceUrl}/${districtId}`, { timeout: AXIOS_TIMEOUT });
          if (!districtResponse.data) {
            return res.status(404).json({ error: 'Distrito não encontrado.' });
          }
          schools = await School.findAll({
            where: { districtId: districtId }
          });
        } catch (error) {
          if (error.code === 'ECONNABORTED') {
            logger.error(`Timeout ao verificar o distrito ${districtId}: ${error.message}`);
            return res.status(504).json({ error: "Timeout ao verificar o distrito." });
          }
          if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Distrito não encontrado.' });
          }
          logger.error("Erro ao verificar o distrito:", error.message);
          return handleServiceError(res, error, "Erro ao verificar o distrito.", 500);
        }
      } else {
        schools = await School.findAll();
      }

      res.json(schools);
      logger.info(`Lista de escolas retornada (filtro por distrito: ${districtId || 'nenhum'})`);
    } catch (err) {
      logger.error('Erro ao buscar escolas:', err);
      return handleServiceError(res, err, "Erro ao buscar as escolas.", 500);
    }
  },
];

exports.getSchoolById = [
  validate(getSchoolByIdValidation),
  async (req, res) => {
    const { id } = req.params;

    try {
      const school = await School.findByPk(id);
      if (!school) {
        return res.status(404).json({ error: "Escola não encontrada" });
      }

      const districtServiceUrl = process.env.DISTRICT_SERVICE_URL;
      if (districtServiceUrl && school.districtId) {
        try {
          const districtResponse = await axios.get(`${districtServiceUrl}/${school.districtId}`, { timeout: AXIOS_TIMEOUT });
          school.dataValues.district = districtResponse.data;
        } catch (error) {
          if (error.code === 'ECONNABORTED') {
            logger.warn(`Timeout ao buscar informações do distrito ${school.districtId}: ${error.message}`);
            // Não retorna erro, apenas loga o aviso
          } else {
            logger.warn(`Erro ao buscar informações do distrito ${school.districtId}:`, error.message);
          }
        }
      }

      res.json(school);
      logger.info(`Detalhes da escola ${id} retornados.`);
    } catch (err) {
      logger.error(`Erro ao buscar a escola ${id}:`, err);
      return handleServiceError(res, err, "Erro ao buscar a escola.", 500);
    }
  },
];

exports.updateSchool = [
  validate(updateSchoolValidation),
  async (req, res) => {
    if (!req.user || (req.user.role !== "Master" && req.user.role !== "Inspetor")) {
      logger.warn(`Acesso negado para usuário ${req.user ? req.user.id : 'não autenticado'} com role ${req.user ? req.user.role : 'desconhecida'} ao tentar atualizar a escola ${req.params.id}.`);
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { id } = req.params;
    const { name, districtId, address, city, state, cep, telephone, status } = req.body;

    try {
      const school = await School.findByPk(id);
      if (!school) return res.status(404).json({ error: "Escola não encontrada" });

      const districtServiceUrl = process.env.DISTRICT_SERVICE_URL;
      if (!districtServiceUrl) {
        logger.error("Variável de ambiente DISTRICT_SERVICE_URL não configurada.");
        return handleServiceError(res, new Error("Erro de configuração do serviço."), "Erro ao atualizar a escola.", 500);
      }

      try {
        const districtResponse = await axios.get(`${districtServiceUrl}/${districtId}`, { timeout: AXIOS_TIMEOUT });
        if (!districtResponse.data) {
          return res.status(400).json({ error: "Distrito não encontrado." });
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          logger.error(`Timeout ao verificar o distrito ${districtId} ao atualizar a escola ${id}: ${error.message}`);
          return res.status(504).json({ error: "Timeout ao verificar o distrito." });
        }
        if (error.response && error.response.status === 404) {
          return res.status(400).json({ error: "Distrito não encontrado." });
        }
        logger.error(`Erro ao verificar o distrito ao atualizar a escola ${id}:`, error.message);
        return handleServiceError(res, error, "Erro ao verificar o distrito.", 500);
      }

      school.name = name || school.name;
      school.districtId = districtId || school.districtId;
      school.address = address || school.address;
      school.city = city || school.city;
      school.state = state || school.state;
      school.cep = cep || school.cep;
      school.telephone = telephone || school.telephone;
      school.status = status || school.status;

      await school.save();
      logger.info(`Escola ${id} atualizada com sucesso por usuário ${req.user ? req.user.id : 'desconhecido'}.`);
      res.json({ message: "Escola atualizada com sucesso!", school });
    } catch (err) {
      logger.error(`Erro ao atualizar a escola ${id}:`, err);
      return handleServiceError(res, err, "Erro ao atualizar a escola.", 500);
    }
  },
];

exports.deleteSchool = [
  validate(deleteSchoolValidation),
  async (req, res) => {
    if (!req.user || (req.user.role !== "Master" && req.user.role !== "Inspetor")) {
      logger.warn(`Acesso negado para usuário ${req.user ? req.user.id : 'não autenticado'} com role ${req.user ? req.user.role : 'desconhecida'} ao tentar excluir a escola ${req.params.id}.`);
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { id } = req.params;

    try {
      const school = await School.findByPk(id);
      if (!school) return res.status(404).json({ error: "Escola não encontrada" });

      await school.destroy();
      logger.info(`Escola ${id} excluída com sucesso por usuário ${req.user ? req.user.id : 'desconhecido'}.`);
      res.json({ message: "Escola excluída com sucesso!" });
    } catch (err) {
      logger.error(`Erro ao excluir a escola ${id}:`, err);
      return handleServiceError(res, err, "Erro ao excluir a escola.", 500);
    }
  },
];