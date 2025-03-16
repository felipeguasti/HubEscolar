const sequelize = require('./src/config/db'); // Caminho para o seu arquivo de configuração do Sequelize
const bcrypt = require('bcryptjs');
const User = require('./src/models/User'); // Caminho para o seu modelo User

async function createMasterUser() {
    try {

        const directorUser = await User.create({
            name: 'Felipe dos Santos Guasti',               // Nome do Diretor
            email: 'contato@felipeguasti.com.br',           // E-mail do Diretor
            password: 'trocarSenh@',               // Senha
            role: 'Master',                      // Função do usuário
            status: 'active',                     // Status do usuário
            horario: 'Manhã',                  // Turno (horário)
            class: null,                          // Classe (opcional)
            content: null,                        // Conteúdo (opcional)
            school: 'EEEFM João Crisostomo Belesa',
            district: 'SRE Cariacica',
            address: null,                        // Endereço (opcional)
            city: null,                           // Cidade (opcional)
            state: null,                          // Estado (opcional)
            zip: null,                            // CEP (opcional)
            gender: 'Masculino',          // Gênero (opcional)
            profilePic: null,                     // Foto de perfil (opcional)
            dateOfBirth: null,                    // Data de nascimento (opcional)
            phone: null,                          // Telefone (opcional)
            cpf: null                             // CPF (opcional)
        });

        console.log('Usuário Master criado com sucesso:', directorUser.email);
    } catch (error) {
        console.error('Erro ao criar o usuário Master:', error);
    } finally {
        sequelize.close(); 
    }
}

createMasterUser();
