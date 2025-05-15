const User = require('../models/User');

// Cache para usuário logado
const userCache = new Map();

// Função para limpar cache antigo
const limparCacheAntigo = () => {
    const agora = Date.now();
    for (const [key, value] of userCache.entries()) {
        if (agora - value.timestamp > 30 * 60 * 1000) { // 30 minutos
            userCache.delete(key);
        }
    }
};

// Executa a limpeza a cada 5 minutos
setInterval(limparCacheAntigo, 5 * 60 * 1000);

const cacheUserMiddleware = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return next();
        }

        const userId = req.user.id;
        const cachedUser = userCache.get(userId);

        if (cachedUser) {
            req.user = cachedUser.data;
            return next();
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'role', 'districtId', 'schoolId']
        });

        if (user) {
            userCache.set(userId, {
                data: user,
                timestamp: Date.now()
            });
            req.user = user;
        }

        next();
    } catch (error) {
        console.error('Erro no middleware de cache:', error);
        next();
    }
};

module.exports = cacheUserMiddleware; 