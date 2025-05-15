const Subject = require('../models/Subject');
const { Op } = require('sequelize');
const logger = require('./loggingService');

class SubjectService {
    static async getAllSubjects() {
        try {
            return await Subject.findAll({
                where: { active: true },
                order: [['name', 'ASC']]
            });
        } catch (error) {
            logger.error('Error in getAllSubjects:', error);
            throw error;
        }
    }

    static async searchSubjects(name) {
        try {
            return await Subject.findAll({
                where: {
                    name: {
                        [Op.iLike]: `%${name}%`
                    },
                    active: true
                },
                order: [['name', 'ASC']]
            });
        } catch (error) {
            logger.error('Error in searchSubjects:', error);
            throw error;
        }
    }

    static async getSubjectById(id) {
        try {
            return await Subject.findByPk(id);
        } catch (error) {
            logger.error('Error in getSubjectById:', error);
            throw error;
        }
    }

    static async createSubject(data) {
        try {
            const existingSubject = await Subject.findOne({
                where: { 
                    name: data.name,
                    active: true 
                }
            });

            if (existingSubject) {
                throw new Error('Subject with this name already exists');
            }

            return await Subject.create(data);
        } catch (error) {
            logger.error('Error in createSubject:', error);
            throw error;
        }
    }

    static async updateSubject(id, data) {
        try {
            const subject = await Subject.findByPk(id);
            
            if (!subject) {
                return null;
            }

            if (data.name && data.name !== subject.name) {
                const existingSubject = await Subject.findOne({
                    where: { 
                        name: data.name,
                        active: true,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingSubject) {
                    throw new Error('Subject with this name already exists');
                }
            }

            await subject.update(data);
            return subject;
        } catch (error) {
            logger.error('Error in updateSubject:', error);
            throw error;
        }
    }

    static async updateSubjectStatus(id, active) {
        try {
            const subject = await Subject.findByPk(id);
            
            if (!subject) {
                return null;
            }

            await subject.update({ active });
            return subject;
        } catch (error) {
            logger.error('Error in updateSubjectStatus:', error);
            throw error;
        }
    }

    static async deleteSubject(id) {
        try {
            const subject = await Subject.findByPk(id);
            
            if (!subject) {
                return false;
            }

            await subject.destroy();
            return true;
        } catch (error) {
            logger.error('Error in deleteSubject:', error);
            throw error;
        }
    }
}

module.exports = SubjectService;