// Função para verificar permissões de criação de usuário
const verificarPermissaoCriacao = (roleUsuarioLogado, roleNovoUsuario) => {
    // Define as permissões por role
    const permissoes = {
        'Master': ['Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Inspetor': ['Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Diretor': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Secretario': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Coordenador': [],
        'Pedagogo': [],
        'Professor': [],
        'Aluno': []
    };

    // Verifica se o role do usuário logado existe nas permissões
    if (!permissoes.hasOwnProperty(roleUsuarioLogado)) {
        return {
            permitido: false,
            mensagem: 'Usuário com role inválido.'
        };
    }

    // Verifica se o usuário tem permissão para criar o role especificado
    if (!permissoes[roleUsuarioLogado].includes(roleNovoUsuario)) {
        return {
            permitido: false,
            mensagem: `Usuário ${roleUsuarioLogado} não tem permissão para criar usuário ${roleNovoUsuario}.`
        };
    }

    return {
        permitido: true
    };
};

// Função para verificar permissões de edição
const verificarPermissaoEdicao = (roleUsuarioLogado, roleUsuarioAlvo, idUsuarioLogado, idUsuarioAlvo) => {
    // Se for o próprio usuário, pode editar suas próprias informações
    if (idUsuarioLogado === idUsuarioAlvo) {
        return { permitido: true };
    }

    // Define as permissões por role
    const permissoes = {
        'Master': ['Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Inspetor': ['Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Diretor': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Secretario': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Coordenador': ['Professor', 'Aluno'],
        'Pedagogo': ['Professor', 'Aluno'],
        'Professor': [],
        'Aluno': []
    };

    if (!permissoes.hasOwnProperty(roleUsuarioLogado)) {
        return {
            permitido: false,
            mensagem: 'Usuário com role inválido.'
        };
    }

    if (!permissoes[roleUsuarioLogado].includes(roleUsuarioAlvo)) {
        return {
            permitido: false,
            mensagem: `Usuário ${roleUsuarioLogado} não tem permissão para editar usuário ${roleUsuarioAlvo}.`
        };
    }

    return { permitido: true };
};

// Função para verificar permissões de exclusão de usuário
const verificarPermissaoExclusao = (roleUsuarioLogado, roleUsuarioAlvo) => {
    // Define as permissões de exclusão por role
    const permissoesExclusao = {
        'Master': ['Master', 'Inspetor', 'Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Inspetor': ['Diretor', 'Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Diretor': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno'],
        'Secretario': ['Coordenador', 'Pedagogo', 'Secretario', 'Professor', 'Aluno']
    };

    // Verifica se o role do usuário logado existe nas permissões
    if (!permissoesExclusao.hasOwnProperty(roleUsuarioLogado)) {
        return {
            permitido: false,
            mensagem: 'Usuário com role inválido.'
        };
    }

    // Verifica se o usuário tem permissão para excluir o role especificado
    if (!permissoesExclusao[roleUsuarioLogado].includes(roleUsuarioAlvo)) {
        return {
            permitido: false,
            mensagem: `Usuário ${roleUsuarioLogado} não tem permissão para excluir usuário ${roleUsuarioAlvo}.`
        };
    }

    return { permitido: true };
};

module.exports = {
    verificarPermissaoCriacao,
    verificarPermissaoEdicao,
    verificarPermissaoExclusao // Exporte a nova função
};