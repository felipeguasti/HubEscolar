const SubjectService = require('../services/subjectService');
const logger = require('../services/loggingService');

class SubjectController {
    static async getAllSubjects(req, res, next) {
        try {
            const subjects = await SubjectService.getAllSubjects();
            return res.status(200).json(subjects);
        } catch (error) {
            logger.error('Error getting all subjects:', error);
            next(error);
        }
    }

    static async searchSubjects(req, res, next) {
        try {
            const { name } = req.query;
            const subjects = await SubjectService.searchSubjects(name);
            return res.status(200).json(subjects);
        } catch (error) {
            logger.error('Error searching subjects:', error);
            next(error);
        }
    }

    static async getSubjectById(req, res, next) {
        try {
            const { id } = req.params;
            const subject = await SubjectService.getSubjectById(id);
            
            if (!subject) {
                return res.status(404).json({ message: 'Subject not found' });
            }
            
            return res.status(200).json(subject);
        } catch (error) {
            logger.error('Error getting subject by id:', error);
            next(error);
        }
    }

    static async createSubject(req, res, next) {
        try {
            const subject = await SubjectService.createSubject(req.body);
            return res.status(201).json(subject);
        } catch (error) {
            logger.error('Error creating subject:', error);
            next(error);
        }
    }

    static async updateSubject(req, res, next) {
        try {
            const { id } = req.params;
            const subject = await SubjectService.updateSubject(id, req.body);
            
            if (!subject) {
                return res.status(404).json({ message: 'Subject not found' });
            }

            return res.status(200).json(subject);
        } catch (error) {
            logger.error('Error updating subject:', error);
            next(error);
        }
    }

    static async updateSubjectStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { active } = req.body;
            const subject = await SubjectService.updateSubjectStatus(id, active);
            
            if (!subject) {
                return res.status(404).json({ message: 'Subject not found' });
            }

            return res.status(200).json(subject);
        } catch (error) {
            logger.error('Error updating subject status:', error);
            next(error);
        }
    }

    static async deleteSubject(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = await SubjectService.deleteSubject(id);
            
            if (!deleted) {
                return res.status(404).json({ message: 'Subject not found' });
            }

            return res.status(204).send();
        } catch (error) {
            logger.error('Error deleting subject:', error);
            next(error);
        }
    }
}

module.exports = SubjectController;