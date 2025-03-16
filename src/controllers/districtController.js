const District = require('../models/District');
const School = require('../models/School');

exports.renderDistrictsPage = async (req, res) => {
    try {
        // Buscar distritos
        const districts = await District.findAll();

        // Buscar todas as escolas
        const schools = await School.findAll();

        // Passa a informação do tipo de usuário
        res.render("districts", {
            title: "Distritos",
            districts: districts,
            schools: schools,
            user: req.user,
        });
    } catch (err) {
        console.error("Erro ao buscar distritos e escolas:", err);
        res.status(500).send("Erro ao carregar os distritos");
    }
};


exports.getDistrictById = async (req, res) => {
    try {
        const { id } = req.params;
        const district = await District.findByPk(id);
        if (!district) {
            return res.status(404).json({ error: "Distrito não encontrado" });
        }
        res.json(district);
    } catch (error) {
        console.error("Erro ao buscar distrito por ID:", error);
        res.status(500).json({ error: "Erro ao buscar distrito" });
    }
};

// Listar todos os distritos
exports.getAllDistricts = async (req, res) => {
    try {
        const districts = await District.findAll();
        res.json(districts);
    } catch (error) {
        console.error("Erro ao buscar distritos:", error);
        res.status(500).json({ error: "Erro ao buscar distritos" });
    }
};

// Criar um novo distrito (Apenas Master)
exports.createDistrict = async (req, res) => {
    // Verifica se o usuário tem permissão de Master
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    try {
        // Desestruturação para pegar o nome do corpo da requisição
        const { name, status } = req.body;
        
        // Verifica se o nome foi enviado
        if (!name) {
            return res.status(400).json({ error: "Nome do distrito é obrigatório" });
        }

        // Criação do distrito no banco de dados
        const district = await District.create({
            name,
            status: status || 'active'  // Se não for enviado o status, usa o padrão 'active'
        });

        // Retorna a resposta com os dados do distrito
        res.status(201).json(district);

    } catch (error) {
        // Log detalhado do erro
        console.error("Erro ao criar distrito:", error);
        
        // Retorna a resposta com erro
        res.status(500).json({ error: "Erro ao criar distrito", details: error.message });
    }
};

exports.updateDistrict = async (req, res) => {
    // Verifica se o usuário tem permissão de "Master"
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    try {
        const { id } = req.params; // Pega o ID do distrito da URL
        const { name, status } = req.body; // Pega o nome e o status do corpo da requisição

        // Valida se o status fornecido é válido
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: "Status inválido." });
        }

        // Encontra o distrito pelo ID
        const district = await District.findByPk(id);
        if (!district) return res.status(404).json({ error: "Distrito não encontrado" });

        // Atualiza os campos conforme necessário
        if (name) district.name = name;
        if (status) district.status = status;

        // Salva as alterações no banco de dados
        await district.save();

        // Retorna o distrito atualizado
        res.json(district);
    } catch (error) {
        console.error("Erro ao atualizar distrito:", error);
        res.status(500).json({ error: "Erro ao atualizar distrito" });
    }
};

// Excluir um distrito (Apenas Master)
exports.deleteDistrict = async (req, res) => {
    if (req.user.role !== "Master") {
        return res.status(403).json({ error: "Acesso negado" });
    }

    try {
        const { id } = req.params;
        const district = await District.findByPk(id);
        if (!district) return res.status(404).json({ error: "Distrito não encontrado" });

        await district.destroy();
        res.json({ message: "Distrito excluído com sucesso" });
    } catch (error) {
        console.error("Erro ao excluir distrito:", error);
        res.status(500).json({ error: "Erro ao excluir distrito" });
    }
};
