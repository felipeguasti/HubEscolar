// src/controllers/gradeController.js
const Grade = require('../models/Grade'); // Importe o modelo Grade
const { handleServiceError } = require('../services/errorHandlingService');
const logger = require('../services/loggingService');

// Buscar uma turma pelo ID
exports.getGradeById = async (req, res) => {
    const { id } = req.params;
    try {
        const grade = await Grade.findByPk(id); // Use findByPk do Sequelize
        if (!grade) {
            return res.status(404).json({ error: "Turma não encontrada" });
        }
        res.json(grade);
    } catch (error) {
        logger.error("Erro ao buscar turma por ID:", error);
        return handleServiceError(res, error, "Erro ao buscar turma.", 500);
    }
};

// Listar todas as turmas ou turmas por escola
exports.getAllGrades = async (req, res) => {
    const { schoolId } = req.query;
    const whereClause = schoolId ? { schoolId } : {};
    try {
        const grades = await Grade.findAll({ where: whereClause }); // Use findAll do Sequelize
        res.json(grades);
    } catch (error) {
        logger.error("Erro ao buscar turmas:", error);
        return handleServiceError(res, error, "Erro ao buscar turmas.", 500);
    }
};

// Criar uma nova turma (Apenas Master, Inspetor, Secretario - verifique a rota para autorização)
exports.createGrade = async (req, res) => {
    try {
        const newGrade = await Grade.create(req.body); // Use create do Sequelize
        logger.info(`Turma criada com sucesso: ${newGrade.id} - ${newGrade.name}`);
        res.status(201).json(newGrade);
    } catch (error) {
        logger.error("Erro ao criar turma:", error);
        return handleServiceError(res, error, "Erro ao criar turma.", 500);
    }
};

// Atualizar uma turma (Apenas Master, Inspetor, Secretario - verifique a rota para autorização)
exports.updateGrade = async (req, res) => {
    const { id } = req.params;
    try {
        const [updatedRows] = await Grade.update(req.body, { // Use update do Sequelize
            where: { id },
        });
        if (updatedRows > 0) {
            const updatedGrade = await Grade.findByPk(id);
            logger.info(`Turma ${id} atualizada com sucesso.`);
            return res.json(updatedGrade);
        }
        return res.status(404).json({ error: "Turma não encontrada" });
    } catch (error) {
        logger.error("Erro ao atualizar turma:", error);
        return handleServiceError(res, error, "Erro ao atualizar turma.", 500);
    }
};

// Excluir uma turma (Apenas Master, Inspetor, Secretario - verifique a rota para autorização)
exports.deleteGrade = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedRows = await Grade.destroy({ // Use destroy do Sequelize
            where: { id },
        });
        if (deletedRows > 0) {
            logger.info(`Turma ${id} excluída com sucesso.`);
            return res.json({ message: "Turma excluída com sucesso" });
        }
        return res.status(404).json({ error: "Turma não encontrada" });
    } catch (error) {
        logger.error("Erro ao excluir turma:", error);
        return handleServiceError(res, error, "Erro ao excluir turma.", 500);
    }
};