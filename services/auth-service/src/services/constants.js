const moment = require('moment-timezone');

module.exports = {
    getMidnightExpiration: () => {
        const now = moment();
        const midnight = moment().endOf('day');
        const diffInSeconds = midnight.diff(now, 'seconds');
        return diffInSeconds;
    },
    JWT_REFRESH_EXPIRATION_TIME: 30,
};