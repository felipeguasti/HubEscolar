const User = require('../models/User');

// Cache para lista de usuários
let usersCache = {
    data: [],
    timestamp: 0,
    isUpdating: false
};

// Tempo de expiração do cache (5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Função para atualizar o cache
const atualizarCache = async () => {
    if (usersCache.isUpdating) return;
    
    try {
        usersCache.isUpdating = true;
        const users = await User.findAll({
            attributes: ['id', 'email']
        });
        
        usersCache = {
            data: users,
            timestamp: Date.now(),
            isUpdating: false
        };
    } catch (error) {
        console.error('Erro ao atualizar cache de usuários:', error);
        usersCache.isUpdating = false;
    }
};

// Função para verificar se um email existe
const emailExiste = async (email) => {
    const agora = Date.now();
    
    // Se o cache estiver expirado ou vazio, atualiza
    if (agora - usersCache.timestamp > CACHE_EXPIRATION || usersCache.data.length === 0) {
        await atualizarCache();
    }
    
    return usersCache.data.some(user => user.email === email);
};

// Função para invalidar o cache (chamada quando um novo usuário é criado)
const invalidarCache = () => {
    usersCache.timestamp = 0;
};

// Atualiza o cache periodicamente
setInterval(atualizarCache, CACHE_EXPIRATION);

module.exports = {
    emailExiste,
    invalidarCache
}; 