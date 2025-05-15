// src/controllers/gradeController.js
require('dotenv').config();
const Grade = require('../models/Grade');
const School = require('../models/School');
const axios = require('axios');
const { handleServiceError } = require('../services/errorHandlingService');
const logger = require('../services/loggingService');
const { Op } = require('sequelize');

const AXIOS_TIMEOUT = 5000;

// Helper function to get district name
async function getDistrictName(districtId, req) {
    try {
        const districtServiceUrl = process.env.DISTRICT_SERVICE_URL;
        if (!districtServiceUrl || !districtId) return 'Não disponível';

        const authorizationHeader = req.headers.authorization;
        const districtToken = authorizationHeader ? authorizationHeader.split(' ')[1] : null;
        
        const districtResponse = await axios.get(`${districtServiceUrl}/districts/${districtId}`, {
            timeout: AXIOS_TIMEOUT,
            headers: {
                Authorization: `Bearer ${districtToken}`,
                'Content-Type': 'application/json'
            }
        });
        return districtResponse.data.name;
    } catch (error) {
        logger.warn(`Erro ao buscar distrito ${districtId}: ${error.message}`);
        return 'Não disponível';
    }
}

// Simplified enrich function
async function enrichGradeWithNames(grade, req) {
    try {
        // The grade should already come with school name from the model
        if (!grade.dataValues.schoolName) {
            const school = await School.findByPk(grade.schoolId);
            grade.dataValues.schoolName = school?.name || 'Não disponível';
        }

        // Get district name through service call
        grade.dataValues.districtName = await getDistrictName(grade.districtId, req);
        
        return grade;
    } catch (error) {
        logger.error('Erro ao enriquecer dados da turma:', error);
        grade.dataValues.schoolName = grade.dataValues.schoolName || 'Não disponível';
        grade.dataValues.districtName = 'Não disponível';
        return grade;
    }
}

// Buscar uma turma pelo ID
exports.getGradeById = async (req, res) => {
    const { id } = req.params;
    try {
        const grade = await Grade.findByPk(id);
        if (!grade) {
            return res.status(404).json({
                status: 'error',
                message: 'Turma não encontrada'
            });
        }

        // Enrich grade with names
        const enrichedGrade = await enrichGradeWithNames(grade, req);

        return res.status(200).json({
            status: 'success',
            data: enrichedGrade
        });
    } catch (error) {
        logger.error("Erro ao buscar turma por ID:", error);
        return handleServiceError(res, error, "Erro ao buscar turma.", 500);
    }
};

// Listar todas as turmas
exports.getAllGrades = async (req, res) => {
    try {
        const grades = await Grade.findAll({
            order: [['year', 'DESC'], ['name', 'ASC']]
        });

        // Enrich each grade with names
        const enrichedGrades = await Promise.all(
            grades.map(grade => enrichGradeWithNames(grade, req))
        );

        return res.status(200).json({
            status: 'success',
            data: enrichedGrades
        });
    } catch (error) {
        logger.error("Erro ao buscar turmas:", error);
        return handleServiceError(res, error, "Erro ao buscar turmas.", 500);
    }
};

// Buscar turmas por escola
exports.getGradesBySchool = async (req, res) => {
    const { schoolId } = req.params;
    try {
        const grades = await Grade.findBySchool(schoolId);
        
        // Enrich each grade with names
        const enrichedGrades = await Promise.all(
            grades.map(grade => enrichGradeWithNames(grade, req))
        );

        return res.status(200).json({
            status: 'success',
            data: enrichedGrades
        });
    } catch (error) {
        logger.error(`Erro ao buscar turmas da escola ${schoolId}:`, error);
        return handleServiceError(res, error, "Erro ao buscar turmas da escola.", 500);
    }
};

// Buscar turmas por distrito
exports.getGradesByDistrict = async (req, res) => {
    const { districtId } = req.params;
    try {
        const grades = await Grade.findByDistrict(districtId);
        
        // Enrich each grade with names
        const enrichedGrades = await Promise.all(
            grades.map(grade => enrichGradeWithNames(grade, req))
        );

        return res.status(200).json({
            status: 'success',
            data: enrichedGrades
        });
    } catch (error) {
        logger.error(`Erro ao buscar turmas do distrito ${districtId}:`, error);
        return handleServiceError(res, error, "Erro ao buscar turmas do distrito.", 500);
    }
};

// Criar uma nova turma
exports.createGrade = async (req, res) => {
    try {
        // Verifica se já existe uma turma com mesmo nome, ano e escola
        const existingGrade = await Grade.findOne({
            where: {
                name: req.body.name,
                year: req.body.year,
                schoolId: req.body.schoolId
            }
        });

        if (existingGrade) {
            logger.warn(`Tentativa de criar turma duplicada: ${req.body.name} - ${req.body.year} - Escola: ${req.body.schoolId}`);
            return res.status(400).json({
                status: 'error',
                message: 'Já existe uma turma com este nome nesta escola para este ano letivo.'
            });
        }

        const newGrade = await Grade.create(req.body);
        logger.info(`Turma criada com sucesso: ${newGrade.id} - ${newGrade.name}`);
        
        // Enrich new grade with names before sending response
        const enrichedGrade = await enrichGradeWithNames(newGrade, req);

        return res.status(201).json({
            status: 'success',
            data: enrichedGrade
        });
    } catch (error) {
        logger.error("Erro ao criar turma:", error);
        return handleServiceError(res, error, "Erro ao criar turma.", 500);
    }
};

// Atualizar uma turma
exports.updateGrade = async (req, res) => {
    const { id } = req.params;
    try {
        const grade = await Grade.findByPk(id);
        if (!grade) {
            return res.status(404).json({
                status: 'error',
                message: 'Turma não encontrada'
            });
        }

        // Verifica se já existe outra turma com mesmo nome, ano e escola
        if (req.body.name || req.body.year || req.body.schoolId) {
            const existingGrade = await Grade.findOne({
                where: {
                    name: req.body.name || grade.name,
                    year: req.body.year || grade.year,
                    schoolId: req.body.schoolId || grade.schoolId,
                    id: { [Op.ne]: id } // Exclui a própria turma da verificação
                }
            });

            if (existingGrade) {
                logger.warn(`Tentativa de atualizar para turma duplicada: ${req.body.name || grade.name} - ${req.body.year || grade.year}`);
                return res.status(400).json({
                    status: 'error',
                    message: 'Já existe uma turma com este nome nesta escola para este ano letivo.'
                });
            }
        }

        await grade.update(req.body);
        logger.info(`Turma ${id} atualizada com sucesso.`);
        
        // Enrich updated grade with names before sending response
        const enrichedGrade = await enrichGradeWithNames(grade, req);

        return res.status(200).json({
            status: 'success',
            data: enrichedGrade
        });
    } catch (error) {
        logger.error("Erro ao atualizar turma:", error);
        return handleServiceError(res, error, "Erro ao atualizar turma.", 500);
    }
};

// Atualizar status da turma
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const grade = await Grade.findByPk(id);
        if (!grade) {
            return res.status(404).json({
                status: 'error',
                message: 'Turma não encontrada'
            });
        }

        await grade.update({ status });
        logger.info(`Status da turma ${id} atualizado para ${status}`);

        // Enrich grade with names before sending response
        const enrichedGrade = await enrichGradeWithNames(grade, req);

        return res.status(200).json({
            status: 'success',
            data: enrichedGrade
        });
    } catch (error) {
        logger.error("Erro ao atualizar status da turma:", error);
        return handleServiceError(res, error, "Erro ao atualizar status da turma.", 500);
    }
};

// Excluir uma turma
exports.deleteGrade = async (req, res) => {
    const { id } = req.params;
    try {
        const grade = await Grade.findByPk(id);
        if (!grade) {
            return res.status(404).json({
                status: 'error',
                message: 'Turma não encontrada'
            });
        }

        await grade.destroy();
        logger.info(`Turma ${id} excluída com sucesso.`);
        return res.status(200).json({
            status: 'success',
            message: 'Turma excluída com sucesso'
        });
    } catch (error) {
        logger.error("Erro ao excluir turma:", error);
        return handleServiceError(res, error, "Erro ao excluir turma.", 500);
    }
};