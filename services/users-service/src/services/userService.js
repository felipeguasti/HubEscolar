const { Op, Sequelize } = require('sequelize');

const applyUserFilters = (user, query) => {
    let whereClause = {};

    // Lógica de permissões baseada no papel do usuário (mantida igual)
    if (user.role === 'Master') {
        // Master pode ver tudo, não adiciona restrição
    } else if (user.role === 'Inspetor') {
        whereClause.districtId = user.districtId;
    } else if (['Diretor', 'Coordenador', 'Pedagogo'].includes(user.role)) {
        whereClause.districtId = user.districtId;
        if (user.schoolId !== undefined) {
            whereClause.schoolId = user.schoolId;
        }
    } else {
        whereClause.districtId = user.districtId;
        if (user.schoolId !== undefined) {
            whereClause.schoolId = user.schoolId;
        }
    }

    // Filtros padrão (incluindo gradeId)
    if (query.districtId) whereClause.districtId = query.districtId;
    if (query.schoolId) whereClause.schoolId = query.schoolId;
    if (query.role) whereClause.role = query.role;
    if (query.subject) whereClause.subject = query.subject;
    if (query.status) whereClause.status = query.status;
    
    // Novo: Usar gradeId para filtrar turmas
    if (query.gradeId) whereClause.gradeId = query.gradeId;
    
    // Manter compatibilidade com userClass por enquanto
    if (query.userClass) whereClause.userClass = query.userClass;

    return whereClause;
};

const applyUserListFilters = (query) => {
    let whereClause = {};
    const orConditions = [];

    if (query.role) {
        whereClause.role = query.role;
    }

    if (query.query) {
        const searchTerm = `%${query.query}%`;
        orConditions.push({ [Op.and]: [Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), Op.like, Sequelize.fn('LOWER', searchTerm))] });
        orConditions.push({ [Op.and]: [Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('email')), Op.like, Sequelize.fn('LOWER', searchTerm))] });
        orConditions.push({ [Op.and]: [Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('cpf')), Op.like, Sequelize.fn('LOWER', searchTerm))] });
        
        // Manter busca em userClass por compatibilidade
        orConditions.push({ [Op.and]: [Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('userClass')), Op.like, Sequelize.fn('LOWER', searchTerm))] });
        
        // Adicionar busca por ID da turma (caso digitem um número)
        if (!isNaN(parseInt(query.query.trim()))) {
            orConditions.push({ gradeId: parseInt(query.query.trim()) });
        }

        if (orConditions.length > 0) {
            whereClause[Op.or] = orConditions;
        }
    }

    // Filtros adicionais
    if (query.status) whereClause.status = query.status;
    if (query.schoolId) whereClause.schoolId = query.schoolId;
    if (query.districtId) whereClause.districtId = query.districtId;
    
    // Novo: filtro por ID da turma
    if (query.gradeId) whereClause.gradeId = query.gradeId;

    return whereClause;
};

// Função para validar CPF
const validarCPF = (cpf) => {
    // Se o CPF for nulo ou vazio, considera como válido (campo opcional)
    if (!cpf) {
        return true;
    }

    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto > 9 ? 0 : resto;
    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;

    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto > 9 ? 0 : resto;
    if (digitoVerificador2 !== parseInt(cpf.charAt(10))) return false;

    return true;
};

// Função para validar telefone
const validarTelefone = (telefone) => {
    // Se o telefone for nulo ou vazio, considera como válido (campo opcional)
    if (!telefone) {
        return true;
    }
    
    // Verificar se contém múltiplos telefones
    if (telefone.includes('|')) {
        // Dividir os telefones e validar cada um
        const telefones = telefone.split('|');
        // Um telefone inválido torna todo o conjunto inválido
        return telefones.every(tel => validarTelefoneSingular(tel.trim()));
    }
    
    // Caso seja um único telefone
    return validarTelefoneSingular(telefone);
};

// Função auxiliar para validar um único telefone
const validarTelefoneSingular = (telefone) => {
    // Remove todos os caracteres não numéricos
    const numerosApenas = telefone.replace(/[^\d]/g, '');
    
    // Verifica se o telefone está vazio
    if (!numerosApenas) {
        return false; // Telefone vazio não é válido quando fornecido
    }
    
    // Verifica se tem pelo menos 10 dígitos (DDD + número)
    if (numerosApenas.length < 10) {
        return false;
    }
    
    // Extrai o DDD e o número
    const ddd = numerosApenas.substring(0, 2);
    const numero = numerosApenas.substring(2);
    
    // Verifica se o DDD é válido
    if (!/^[1-9][0-9]$/.test(ddd)) {
        return false;
    }
    
    // Verifica se é celular (começa com 9)
    if (numero.startsWith('9')) {
        return numero.length >= 9 && numero.length <= 10;
    }
    
    // Verifica se é fixo (começa com 2, 3, 4 ou 5)
    if (/^[2-5]/.test(numero)) {
        return numero.length >= 8 && numero.length <= 9;
    }
    
    // Se não se encaixar em nenhum dos padrões
    return false;
};

// Função para validar data de nascimento
const validarDataNascimento = (data) => {
    // Se a data for nula ou vazia, considera como válido (campo opcional)
    if (!data) {
        return true;
    }

    const dataNascimento = new Date(data);
    const hoje = new Date();
    const idadeMinima = 7; // Idade mínima para cadastro

    // Verifica se é uma data válida
    if (isNaN(dataNascimento.getTime())) return false;

    // Verifica se não é uma data futura
    if (dataNascimento > hoje) return false;

    // Calcula a idade
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mes = hoje.getMonth() - dataNascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNascimento.getDate())) {
        idade--;
    }

    return idade >= idadeMinima;
};

// Função para validar CEP
const validarCEP = (cep) => {
    // Se o CEP for nulo ou vazio, considera como válido (campo opcional)
    if (!cep) {
        return true;
    }

    // Remove todos os caracteres não numéricos
    cep = cep.replace(/[^\d]/g, '');

    // Verifica se tem 8 dígitos
    if (cep.length !== 8) return false;

    // Verifica se é um CEP válido (primeiro dígito não pode ser 0)
    return /^[1-9]\d{7}$/.test(cep);
};

module.exports = {
    applyUserFilters,
    applyUserListFilters,
    validarCPF,
    validarTelefone,
    validarDataNascimento,
    validarCEP
};