const Grade = require('../models/Grade'); // Importa o modelo correto
const District = require('../models/District');
const School = require('../models/School'); // Corrigido: Importar School corretamente

// Renderiza a página de turmas com os dados necessários
exports.renderGradesPage = async (req, res) => {
    try {
        const districts = await District.findAll({ attributes: ["id", "name"] });
        const schools = await School.findAll({ attributes: ["id", "name", "districtId"] });
        const grades = await Grade.findAll({ attributes: ["id", "name", "schoolId", "status"] });

        // Criar um dicionário de distritos
        const districtMap = {};
        districts.forEach(district => {
            districtMap[district.id] = district.name;
        });

        // Criar um dicionário de escolas e associá-las ao distrito
        const schoolMap = {};
        schools.forEach(school => {
            schoolMap[school.id] = {
                name: school.name,
                districtId: school.districtId,
            };
        });

        // Filtrando as escolas de acordo com o districtId do Inspetor
        let filteredSchools = schools;
        if (req.user.districtId) {
            filteredSchools = schools.filter(school => school.districtId === req.user.districtId);
        }

        const gradesWithNames = grades.map(grade => {
            const school = schoolMap[grade.schoolId] || {};
            return {
                id: grade.id,
                name: grade.name,
                schoolId: grade.schoolId,
                schoolName: school.name || "Desconhecido", // Pegar o nome da escola
                districtName: districtMap[school.districtId] || "Desconhecido", // Pegar o distrito da escola
                districtId: school.districtId || null, // Adicionando o districtId aqui
            };
        });

        // Filtrando as turmas com base no districtId do Inspetor
        let gradesToDisplay = gradesWithNames;

        if (req.user.role === 'Master' && req.query.districtId) {
            gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.query.districtId);
        } else if (req.user.districtId) {
            gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.user.districtId);
        }

        res.render("grades", {
            title: "Turmas",
            districts,
            schools: filteredSchools,  // Exibindo apenas as escolas filtradas
            grades: gradesToDisplay,  // Exibindo as turmas filtradas
            user: req.user,
            districtId: req.query.districtId || req.user.districtId,
            districtMap: districtMap,
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

// Listar todas as turmas ou turmas por escola
exports.getAllGrades = async (req, res) => {
    const schoolId = req.query.schoolId;

    try {
        let grades;
        if (schoolId) {
            // Se schoolId for fornecido, busca turmas por escola
            grades = await Grade.findAll({
                where: { schoolId: schoolId }
            });
        } else {
            // Se schoolId não for fornecido, busca todas as turmas
            grades = await Grade.findAll();
        }
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
