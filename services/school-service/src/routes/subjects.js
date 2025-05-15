const express = require('express');
const router = express.Router();
const SubjectController = require('../controllers/subjectController');

// GET - List all subjects
router.get('/list', SubjectController.getAllSubjects);

// GET - Search subjects by name
router.get('/search', SubjectController.searchSubjects);

// GET - Get subject by ID
router.get('/:id', SubjectController.getSubjectById);

// POST - Create new subject
router.post('/create', SubjectController.createSubject);

// PUT - Update subject
router.put('/edit/:id', SubjectController.updateSubject);

// PATCH - Update subject status (active/inactive)
router.patch('/edit/:id/status', SubjectController.updateSubjectStatus);

// DELETE - Delete subject
router.delete('/delete/:id', SubjectController.deleteSubject);

module.exports = router;