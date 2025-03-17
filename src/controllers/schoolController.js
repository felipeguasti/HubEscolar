const School = require("../models/School");
const District = require("../models/District");

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

    const { name, districtId, address, city, state, cep, telephone, status } = req.body;

    try {
        // Verifica se o distrito existe com o ID fornecido
        const districtExists = await District.findByPk(districtId); // Assumindo que você tem um modelo District
        if (!districtExists) {
            return res.status(400).json({ error: "Distrito não encontrado" });
        }

        // Verifica se já existe uma escola com o mesmo nome dentro do mesmo distrito
        const existingSchool = await School.findOne({ where: { name, districtId: districtId } });

        if (existingSchool) {
            return res.status(400).json({ error: "Já existe uma escola com este nome neste distrito." });
        }

        // Criação da escola
        const school = await School.create({
            name,
            districtId: districtId,  // Associando o ID do distrito
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

// Obter todas as escolas ou filtrar por districtId
exports.getAllSchool = async (req, res) => {
    try {
        const { districtId } = req.query; // Pegando o 'district' da query

        let schools;
        if (districtId) {
            // Se o 'districtId' for passado, filtra as escolas pelo 'districtId'
            schools = await School.findAll({
                where: { districtId: districtId } // Supondo que 'districtId' seja a coluna associada no modelo School
            });
        } else {
            // Caso contrário, retorna todas as escolas
            schools = await School.findAll();
        }

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
    const { name, districtId, address, city, state, cep, telephone, status } = req.body;

    try {
        const school = await School.findByPk(id);
        if (!school) return res.status(404).json({ error: "Escola não encontrada" });

        // Verifica se o distrito existe com o ID fornecido
        const districtExists = await District.findByPk(districtId); // Assumindo que você tem um modelo District
        if (!districtExists) {
            return res.status(400).json({ error: "Distrito não encontrado" });
        }

        // Atualiza os campos
        school.name = name;
        school.districtId = districtId; // Atualizando o distrito com o novo ID
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
