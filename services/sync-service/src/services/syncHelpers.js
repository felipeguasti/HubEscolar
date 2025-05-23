/**
 * Normaliza um nome para comparação
 * @param {string} nome - Nome a ser normalizado
 * @returns {string} - Nome normalizado
 */
function normalizarNome(nome) {
    return nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Trata nome de aluno considerando nome social entre parênteses e removendo caracteres especiais
 * @param {string} nomeCompleto - Nome completo original do aluno
 * @returns {string} Nome processado
 */
function processarNomeAluno(nomeCompleto) {
    if (!nomeCompleto) return '';
    
    // Substituir todos os caracteres especiais por espaços
    let nomeLimpo = nomeCompleto.replace(/[\r\n\t]/g, ' ').trim();
    
    // Verificar se há nome social entre parênteses
    const regexNomeSocial = /\(([^)]+)\)/;
    const match = nomeLimpo.match(regexNomeSocial);
    
    if (match && match[1]) {
        // Se encontrou nome social entre parênteses, usa ele
        const nomeSocial = match[1].trim();
        // Limpar novamente para garantir que não há caracteres especiais no nome social
        return nomeSocial.replace(/[\r\n\t]/g, ' ').trim();
    }
    
    // Se não encontrou nome social, retorna o nome original limpo
    return nomeLimpo;
}

/**
 * Remove caracteres especiais e todo conteúdo após eles
 * @param {string} nome - Nome a ser limpo
 * @returns {string} Nome limpo até o primeiro caractere especial
 */
function limparNomeCompletoAteCaractereEspecial(nome) {
    if (!nome) return '';
    
    // Procurar pela primeira ocorrência de qualquer caractere especial
    const match = nome.match(/[\r\n\t]/);
    if (match && match.index > 0) {
        // Se encontrou, retornar apenas a parte antes do caractere especial
        return nome.substring(0, match.index);
    }
    
    // Se não encontrou caractere especial, retornar o nome original
    return nome;
}

/**
 * Gera username válido a partir do nome do aluno
 * @param {string} nomeCompleto - Nome completo do aluno
 * @returns {string} Username gerado
 */
function gerarUsernameValido(nomeCompleto) {
    // Processar o nome considerando nome social e caracteres especiais
    const nomeTratado = processarNomeAluno(nomeCompleto);
    
    // Extrair primeiro e último nome
    const nomePartes = nomeTratado.split(' ').filter(part => part.trim().length > 0);
    
    if (nomePartes.length === 0) {
        // Se após todo processamento não houver nome válido, gerar username padrão
        return `aluno${Date.now().toString().substring(8)}`;
    }
    
    const primeiroNome = nomePartes[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ultimoNome = nomePartes[nomePartes.length - 1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Gerar username no formato primeiro.ultimo
    let username = `${primeiroNome}.${ultimoNome}`;
    
    // Garantir que não exceda 30 caracteres
    if (username.length > 27) {
        username = username.substring(0, 27);
    }
    
    // Adicionar número aleatório para evitar duplicação
    username = `${username}${Math.floor(Math.random() * 100)}`;
    
    return username;
}

/**
 * Valida e formata telefones, removendo números inválidos
 * @param {string|Array} telefones - Telefone único ou array de telefones
 * @returns {string} - Telefones formatados e válidos separados por '|' ou string vazia
 */
function validarFormatarTelefones(telefones) {
    // Caso não haja telefone, retornar string vazia
    if (!telefones) return '';
    
    // Se for uma string única, converter para array
    const arrayTelefones = Array.isArray(telefones) ? telefones : 
                          (telefones.includes('|') ? telefones.split('|') : [telefones]);
    
    // Filtrar apenas números válidos (com pelo menos 11 dígitos após remover não-numéricos)
    const telefonesValidos = arrayTelefones
        .map(tel => tel.replace(/[^\d() -]/g, '').trim()) // Remover caracteres inválidos
        .filter(tel => {
            const apenasDigitos = tel.replace(/\D/g, '');
            // Verificar se tem pelo menos 10 dígitos (incluindo DDD)
            return apenasDigitos.length >= 11;
        });
    
    // Retornar telefones válidos separados por '|' ou string vazia
    return telefonesValidos.length > 0 ? telefonesValidos.join('|') : '';
}

/**
 * Determina o turno com base no nome da turma
 * @param {string} turmaNome - Nome da turma
 * @returns {string} Turno (Manhã, Tarde, Noite ou Integral)
 */
function determinarTurnoTurma(turmaNome) {
    let shift = "Integral"; // Padrão
    
    // Verificar se o nome da turma tem pelo menos 3 caracteres
    if (turmaNome.length >= 3) {
        // Extrair a terceira letra
        const terceiraLetra = turmaNome.charAt(2).toUpperCase();
        
        // Determinar turno com base na terceira letra
        switch (terceiraLetra) {
            case 'M':
                shift = "Manhã";
                break;
            case 'V':
                shift = "Tarde";
                break;
            case 'N':
                shift = "Noite";
                break;
            case 'I':
                shift = "Integral";
                break;
            default:
                shift = "Integral"; // Padrão caso não identifique
        }
    }
    
    return shift;
}

/**
 * Gera a descrição para uma turma com base no seu nome e turno
 * @param {string} turmaNome - Nome da turma
 * @param {string} shift - Turno da turma
 * @returns {string} Descrição formatada da turma
 */
function gerarDescricaoTurma(turmaNome, shift) {
    // Construir descrição baseada no nome da turma
    let description = "Turma";
    
    if (turmaNome.includes("1ª")) {
        description = "Turma do primeiro ano";
    } else if (turmaNome.includes("2ª")) {
        description = "Turma do segundo ano";
    } else if (turmaNome.includes("3ª")) {
        description = "Turma do terceiro ano";
    } else if (turmaNome.includes("4ª")) {
        description = "Turma do quarto ano";
    } else if (turmaNome.includes("5ª")) {
        description = "Turma do quinto ano";
    } else if (turmaNome.includes("6ª")) {
        description = "Turma do sexto ano";
    } else if (turmaNome.includes("7ª")) {
        description = "Turma do sétimo ano";
    } else if (turmaNome.includes("8ª")) {
        description = "Turma do oitavo ano";
    } else if (turmaNome.includes("9ª")) {
        description = "Turma do nono ano";
    }
    
    // Adicionar nível de ensino
    if (turmaNome.includes("EM")) {
        description += " do ensino médio";
    } else if (turmaNome.includes("EF")) {
        description += " do ensino fundamental";
    }
    
    description += ` do turno ${shift}`;
    
    return description;
}

/**
 * Cria objeto de turma no formato esperado pelo school-service
 * @param {string} turmaNome - Nome da turma
 * @param {number} schoolId - ID da escola
 * @param {number} districtId - ID do distrito
 * @param {string} shift - Turno da turma
 * @param {string} description - Descrição da turma
 * @returns {Object} Objeto da turma formatado
 */
function criarObjetoTurma(turmaNome, schoolId, districtId, shift, description) {
    const currentYear = new Date().getFullYear();
    
    return {
        name: turmaNome,
        schoolId: schoolId,
        districtId: districtId || 1, // Usar valor padrão se não houver districtId
        year: currentYear,
        shift: shift,
        startDate: "2025-02-03", // Data fixa conforme especificado
        endDate: "2025-12-23",   // Data fixa conforme especificado
        status: "active",
        description: description
    };
}

/**
 * Filtra turmas que já existem na escola
 * @param {Array} turmasProcessadas - Turmas processadas do SEGES
 * @param {Array} turmasExistentes - Turmas existentes na escola
 * @param {Function} logger - Função de log (opcional)
 * @returns {Object} Turmas novas e existentes
 */
function filtrarTurmasExistentes(turmasProcessadas, turmasExistentes, logger) {
    const turmasNovas = [];
    const turmasExistentesArr = [];
    
    // Garantir que turmasExistentes seja um array
    const turmasExistentesArray = Array.isArray(turmasExistentes) ? turmasExistentes : [];
    
    // Criar mapa para busca mais eficiente
    const turmasExistentesMap = {};
    turmasExistentesArray.forEach(turma => {
        turmasExistentesMap[turma.name] = turma;
    });
    
    // Filtrar turmas que já existem
    turmasProcessadas.forEach(turma => {
        if (turmasExistentesMap[turma.name]) {
            // Turma existe
            turmasExistentesArr.push({ 
                ...turma, 
                id: turmasExistentesMap[turma.name].id 
            });
        } else {
            // Turma não existe
            turmasNovas.push(turma);
        }
    });
    
    // Usar logger se fornecido
    if (logger) {
        logger.info(`${turmasNovas.length} turmas novas, ${turmasExistentesArr.length} turmas já existentes`);
    }
    
    return {
        turmasNovas,
        turmasExistentes: turmasExistentesArr
    };
}


/**
 * Determina o horário de um aluno baseado no nome da turma
 * @param {string} turmaNome - Nome da turma
 * @returns {string} Horário do aluno (Manhã, Tarde, Noite ou Integral)
 */
function determinarHorarioAluno(turmaNome) {
    // Usar a mesma lógica do turno para determinar o horário do aluno
    return determinarTurnoTurma(turmaNome);
}

/**
 * Formata uma data de nascimento do formato DD/MM/AAAA para YYYY-MM-DD
 * @param {string} dataString - String de data no formato DD/MM/AAAA ou outro
 * @returns {string|null} Data formatada em YYYY-MM-DD ou null se inválida
 */
function formatarDataNascimento(dataString) {
    if (!dataString) return null;
    
    try {
        // Se já estiver no formato YYYY-MM-DD, manter
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
            return dataString;
        }
        
        // Converter de DD/MM/YYYY para YYYY-MM-DD
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dataString)) {
            const [dia, mes, ano] = dataString.split('/');
            return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Formata um gênero para começar com letra maiúscula
 * @param {string} generoString - String com o gênero
 * @returns {string} Gênero formatado ou string vazia se inválido
 */
function formatarGenero(generoString) {
    if (!generoString) return '';
    
    const generoNormalizado = generoString.trim().toLowerCase();
    
    if (generoNormalizado) {
        return generoNormalizado.charAt(0).toUpperCase() + generoNormalizado.slice(1);
    }
    
    return '';
}

// Atualizar exports para incluir as novas funções
module.exports = {
    normalizarNome,
    processarNomeAluno,
    limparNomeCompletoAteCaractereEspecial,
    gerarUsernameValido,
    validarFormatarTelefones,
    determinarTurnoTurma,
    gerarDescricaoTurma,
    criarObjetoTurma,
    filtrarTurmasExistentes,
    determinarHorarioAluno,
    formatarDataNascimento,
    formatarGenero
};