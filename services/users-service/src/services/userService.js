const applyUserFilters = (user, query) => {
    let whereClause = {};

    if (user.role === 'Master') {
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

    if (query.districtId) whereClause.districtId = query.districtId;
    if (query.schoolId) whereClause.schoolId = query.schoolId;
    if (query.role) whereClause.role = query.role;
    if (query.subject) whereClause.subject = query.subject;
    if (query.userClass) whereClause.userClass = query.userClass;
    if (query.status) whereClause.status = query.status;

    return whereClause;
};

// Função para validar CPF
const validarCPF = (cpf) => {
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
    // Remove todos os caracteres não numéricos
    telefone = telefone.replace(/[^\d]/g, '');

    // Verifica se o telefone está vazio (agora opcional)
    if (!telefone) {
        return true; // Telefone vazio é considerado válido
    }

    // Verifica se é celular (começa com 9)
    if (telefone.startsWith('9')) {
        return telefone.length >= 9 && telefone.length <= 12;
    }

    // Verifica se é fixo (começa com 2, 3, 4 ou 5)
    if (/^[2-5]/.test(telefone)) {
        return telefone.length >= 8 && telefone.length <= 11;
    }

    // Se não se encaixar em nenhum dos padrões
    return false;
};

// Função para validar data de nascimento
const validarDataNascimento = (data) => {
    const dataNascimento = new Date(data);
    const hoje = new Date();
    const idadeMinima = 14; // Idade mínima para cadastro
    
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
    // Remove todos os caracteres não numéricos
    cep = cep.replace(/[^\d]/g, '');
    
    // Verifica se tem 8 dígitos
    if (cep.length !== 8) return false;
    
    // Verifica se é um CEP válido (primeiro dígito não pode ser 0)
    return /^[1-9]\d{7}$/.test(cep);
};

module.exports = {
    applyUserFilters,
    validarCPF,
    validarTelefone,
    validarDataNascimento,
    validarCEP
};