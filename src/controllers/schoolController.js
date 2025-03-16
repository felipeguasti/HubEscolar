const School = require("../models/School");

// Renderizar página com todas as escolas
exports.renderSchoolPage = async (req, res) => {
    try {
        const schools = await School.findAll(); // Busca todas as escolas no banco
        res.render("school", { schools });
    } catch (err) {
        console.error("Erro ao carregar as escolas:", err);
        res.status(500).send("Erro ao carregar as escolas");
    }
};

// Criar uma nova escola
exports.createSchool = async (req, res) => {
    if (req.user.role !== "Master" && req.user.role !== "Inspetor") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    const { name, district, address, city, state, cep, telephone, status } = req.body;

    try {
        // Verifica se já existe uma escola com o mesmo nome dentro do mesmo distrito
        const existingSchool = await School.findOne({ where: { name, district } });

        if (existingSchool) {
            return res.status(400).json({ error: "Já existe uma escola com este nome neste distrito." });
        }

        // Criação da escola
        const school = await School.create({
            name,
            district,
            address,
            city,
            state,
            cep,
            telephone,
            status,
        });

        res.status(201).json({ message: "Escola criada com sucesso!", school });
    } catch (err) {
        console.error("Erro ao criar escola:", err);
        res.status(500).json({ error: "Erro ao criar a escola" });
    }
};

// Obter todas as escolas
exports.getAllSchool = async (req, res) => {
    try {
        const schools = await School.findAll();
        res.json(schools);
    } catch (err) {
        console.error("Erro ao buscar escolas:", err);
        res.status(500).json({ error: "Erro ao buscar as escolas" });
    }
};

// Obter uma escola específica pelo ID
exports.getSchoolById = async (req, res) => {
    const { id } = req.params;

    try {
        const school = await School.findByPk(id);
        if (!school) {
            return res.status(404).json({ error: "Escola não encontrada" });
        }
        res.json(school);
    } catch (err) {
        console.error("Erro ao buscar a escola:", err);
        res.status(500).json({ error: "Erro ao buscar a escola" });
    }
};

// Atualizar uma escola pelo ID
exports.updateSchool = async (req, res) => {
    if (req.user.role !== "Master" && req.user.role !== "Inspetor") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    const { id } = req.params;
    const { name, district, address, city, state, cep, telephone, status } = req.body;

    try {
        const school = await School.findByPk(id);
        if (!school) return res.status(404).json({ error: "Escola não encontrada" });

        // Atualiza os campos
        school.name = name;
        school.district = district;
        school.address = address;
        school.city = city;
        school.state = state;
        school.cep = cep;
        school.telephone = telephone;
        school.status = status;

        await school.save();
        res.json({ message: "Escola atualizada com sucesso!", school });
    } catch (err) {
        console.error("Erro ao atualizar a escola:", err);
        res.status(500).json({ error: "Erro ao atualizar a escola" });
    }
};

// Excluir uma escola pelo ID
exports.deleteSchool = async (req, res) => {
    if (req.user.role !== "Master" && req.user.role !== "Inspetor") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    const { id } = req.params;

    try {
        const school = await School.findByPk(id);
        if (!school) return res.status(404).json({ error: "Escola não encontrada" });

        await school.destroy();
        res.json({ message: "Escola excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir a escola:", err);
        res.status(500).json({ error: "Erro ao excluir a escola" });
    }
};
