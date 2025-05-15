const express = require('express');
const router = express.Router();
const subjectService = require('../services/subjectService');
const isAuthenticated = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

router.use(isAuthenticated);

// Rota para renderizar a página principal de matérias
router.get("/", async (req, res) => {
    try {
        const subjects = await subjectService.getAllSubjects(req.cookies.token);
        res.render("users/subjects", {
            title: "Matérias",
            subjects,
            role: req.role,
            user: req.user,
        });
    } catch (error) {
        res.status(500).render('error', { message: 'Erro ao carregar matérias' });
    }
});

// Rota para listar todas as matérias (dados JSON)
router.get("/list", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const subjects = await subjectService.getAllSubjects(accessToken);
        res.json(subjects);
    } catch (error) {
        next(error);
    }
});

// Rota para buscar matérias por nome
router.get("/search", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const { name } = req.query;
        const subjects = await subjectService.searchSubjects(accessToken, name);
        res.json(subjects);
    } catch (error) {
        next(error);
    }
});

// Rota para criar uma nova matéria
router.post("/create", requireRole(["Master", "Inspetor"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const subject = await subjectService.createSubject(accessToken, req.body);
        res.status(201).json(subject);
    } catch (error) {
        next(error);
    }
});

// Rota para obter uma matéria específica pelo ID
router.get("/:id", async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const subject = await subjectService.getSubjectById(accessToken, req.params.id);
        if (!subject) {
            return res.status(404).json({ message: 'Matéria não encontrada' });
        }
        res.json(subject);
    } catch (error) {
        next(error);
    }
});

// Rota para atualizar uma matéria pelo ID
router.put("/edit/:id", requireRole(["Master", "Inspetor"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const subject = await subjectService.updateSubject(accessToken, req.params.id, req.body);
        res.json(subject);
    } catch (error) {
        next(error);
    }
});

// Rota para atualizar o status de uma matéria
router.patch("/edit/:id/status", requireRole(["Master", "Inspetor"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        const subject = await subjectService.updateSubjectStatus(accessToken, req.params.id, req.body.active);
        res.json(subject);
    } catch (error) {
        next(error);
    }
});

// Rota para excluir uma matéria pelo ID
router.delete("/delete/:id", requireRole(["Master", "Inspetor"]), async (req, res, next) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    try {
        await subjectService.deleteSubject(accessToken, req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

module.exports = router;