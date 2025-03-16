const Grade = require('../models/Grade'); // Importa o modelo correto
const District = require('../models/District');
const School = require('../models/School'); // Corrigido: Importar School corretamente

// Renderiza a página de turmas com os dados necessários
exports.renderGradesPage = async (req, res) => {
    try {
        const districts = await District.findAll();
        const schools = await School.findAll();
        const grades = await Grade.findAll(); // Buscar as turmas

        res.render("grades", {
            title: "Turmas",
            districts,
            schools,
            grades, // Passando as turmas para o EJS
            user: req.user,
        });
    } catch (err) {
        console.error("Erro ao buscar dados para a página de turmas:", err);
        res.status(500).send("Erro ao carregar a página de turmas.");
    }
};

// Buscar uma turma pelo ID
exports.getGradeById = async (req, res) => {
    try {
        const { id } = req.params;
        const grade = await Grade.findByPk(id);
        if (!grade) {
            return res.status(404).json({ error: "Turma não encontrada" });
        }
        res.json(grade);
    } catch (error) {
        console.error("Erro ao buscar turma por ID:", error);
        res.status(500).json({ error: "Erro ao buscar turma" });
    }
};

// Listar todas as turmas
exports.getAllGrades = async (req, res) => {
    try {
        const grades = await Grade.findAll();
        res.json(grades);
    } catch (error) {
        console.error("Erro ao buscar turmas:", error);
        res.status(500).json({ error: "Erro ao buscar turmas" });
    }
};

// Criar uma nova turma (Apenas Master)
exports.createGrade = async (req, res) => {
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    try {
        const { name, district, year, shift, startDate, endDate, status, description } = req.body;

        if (!name || !district || !year || !shift || !startDate) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
        }

        const grade = await Grade.create({
            name,
            district,
            year,
            shift,
            startDate,
            endDate: endDate || null,
            status: status || 'active',
            description: description || null,
        });

        res.status(201).json(grade);
    } catch (error) {
        console.error("Erro ao criar turma:", error);
        res.status(500).json({ error: "Erro ao criar turma", details: error.message });
    }
};

// Atualizar uma turma (Apenas Master)
exports.updateGrade = async (req, res) => {
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    try {
        const { id } = req.params;
        const { name, district, year, shift, startDate, endDate, status, description } = req.body;

        const grade = await Grade.findByPk(id);
        if (!grade) return res.status(404).json({ error: "Turma não encontrada" });

        // Atualiza os campos
        if (name) grade.name = name;
        if (district) grade.district = district;
        if (year) grade.year = year;
        if (shift) grade.shift = shift;
        if (startDate) grade.startDate = startDate;
        if (endDate !== undefined) grade.endDate = endDate;
        if (status) grade.status = status;
        if (description) grade.description = description;

        await grade.save();
        res.json(grade);
    } catch (error) {
        console.error("Erro ao atualizar turma:", error);
        res.status(500).json({ error: "Erro ao atualizar turma" });
    }
};

// Excluir uma turma (Apenas Master)
exports.deleteGrade = async (req, res) => {
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    try {
        const { id } = req.params;
        const grade = await Grade.findByPk(id);
        if (!grade) return res.status(404).json({ error: "Turma não encontrada" });

        await grade.destroy();
        res.json({ message: "Turma excluída com sucesso" });
    } catch (error) {
        console.error("Erro ao excluir turma:", error);
        res.status(500).json({ error: "Erro ao excluir turma" });
    }
};
