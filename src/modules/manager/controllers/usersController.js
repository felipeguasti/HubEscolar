exports.adicionarUsuario = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).send('Usuário já existe.');
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        await Usuario.create({ nome, email, senha: senhaHash });

        res.status(201).send('Usuário criado com sucesso.');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.atualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email } = req.body;

        const [linhasAtualizadas, [usuarioAtualizado]] = await Usuario.update({ nome, email }, {
            where: { id },
            returning: true
        });

        if (!linhasAtualizadas) {
            return res.status(404).send('Usuário não encontrado.');
        }

        res.json(usuarioAtualizado);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.deletarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const deletado = await Usuario.destroy({ where: { id } });

        if (!deletado) {
            return res.status(404).send('Usuário não encontrado.');
        }

        res.send('Usuário excluído com sucesso.');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
