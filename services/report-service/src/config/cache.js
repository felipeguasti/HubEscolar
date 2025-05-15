const NodeCache = require('node-cache');

const cache = new NodeCache({
    stdTTL: 24 * 60 * 60, // 24 horas
    checkperiod: 60 * 60 // Checar expiração a cada hora
});

module.exports = { cache };