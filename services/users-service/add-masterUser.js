const sequelize = require('./src/config/db'); // Caminho para o seu arquivo de configuração do Sequelize
const User = require('./src/models/User'); // Caminho para o seu modelo User

async function createOrUpdateMasterUser() {
    try {
        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ where: { email: 'contato@felipeguasti.com.br' } });

        if (existingUser) {
            // Atualizar o usuário existente
            await existingUser.update({
                name: 'Felipe dos Santos Guasti',
                password: 'trocarSenh@', // Senha em texto puro (sem hash)
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
                cpf: null,
            });
            console.log('Usuário Master atualizado com sucesso:', existingUser.email);
        } else {
            // Criar um novo usuário
            const directorUser = await User.create({
                name: 'Felipe dos Santos Guasti',
                email: 'contato@felipeguasti.com.br',
                password: 'trocarSenh@', // Senha em texto puro (sem hash)
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
                cpf: null,
            });
            console.log('Usuário Master criado com sucesso:', directorUser.email);
        }
    } catch (error) {
        console.error('Erro ao criar ou atualizar o usuário Master:', error);
    } finally {
        sequelize.close();
    }
}

createOrUpdateMasterUser();