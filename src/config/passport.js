const passport = require('passport');
const authService = require('../services/authService');

passport.serializeUser((user, done) => {
    done(null, user ? user.id : null);
});

passport.deserializeUser(async (id, done) => {
    if (id) {
        try {
            const user = await authService.getUserInfoByToken(token);

            if (user && user.id === id) {
                done(null, user);
            } else {
                done(null, false);
            }
        } catch (error) {
            console.error('Erro ao desserializar usuário:', error);
            done(error, false);
        }
    } else {
        done(null, false);
    }
});

module.exports = passport;