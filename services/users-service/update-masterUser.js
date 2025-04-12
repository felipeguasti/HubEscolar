const sequelize = require('./src/config/db');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function updateMasterUser() {
    try {
        const masterUserEmail = 'contato@felipeguasti.com.br';
        const newPassword = 'trocarSenh@';

        // Hashear a nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10); // O '10' é o salt rounds

        const [affectedRows] = await User.update({
            name: 'Felipe dos Santos Guasti',
            email: masterUserEmail,
            password: hashedPassword, // Salvar a senha hasheada
            role: 'Master',
            status: 'active',
            horario: 'Manhã',
            class: null,
            content: null,
            schoolId: null,
            districtId: null,
            address: null,
            city: null,
            state: null,
            zip: null,
            gender: 'Masculino',
            profilePic: null,
            dateOfBirth: null,
            phone: null,
            cpf: null
        }, {
            where: {
                email: masterUserEmail
            }
        });

        if (affectedRows > 0) {
            console.log(`Senha do usuário Master com e-mail ${masterUserEmail} atualizada com sucesso.`);
        } else {
            console.log(`Nenhum usuário Master encontrado com o e-mail ${masterUserEmail} para atualizar a senha.`);
        }

    } catch (error) {
        console.error('Erro ao atualizar a senha do usuário Master:', error);
    } finally {
        try {
            await sequelize.close();
            console.log('Conexão com o banco de dados fechada.');
        } catch (err) {
            console.error('Erro ao fechar a conexão com o banco de dados:', err);
        }
    }
}

updateMasterUser();