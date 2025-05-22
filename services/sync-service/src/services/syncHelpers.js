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

module.exports = {
    normalizarNome,
    processarNomeAluno,
    limparNomeCompletoAteCaractereEspecial,
    gerarUsernameValido,
    validarFormatarTelefones
};