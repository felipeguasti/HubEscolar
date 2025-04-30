import moment from 'moment-timezone';

export const getMidnightExpiration = () => {
    const now = moment();
    const midnight = moment().endOf('day');
    const diffInSeconds = midnight.diff(now, 'seconds');
    return diffInSeconds;
};

export const JWT_EXPIRATION_TIME = 3600; // 1 hour in seconds
export const JWT_REFRESH_EXPIRATION_TIME = 30; // 30 days