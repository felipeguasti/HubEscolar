const User = require('../models/User');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');


const renderUsersPage = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        let whereClause = {};

        if (user.role === 'Master') {
            // Master pode ver tudo
            whereClause = {};
        } else if (user.role === 'Inspetor') {
            // Inspetor vê todos do mesmo district
            whereClause.district = user.district;
        } else if (user.role === 'Diretor') {
            // Diretor vê Pedagogo, Coordenador, Professor e Aluno da mesma school e district
            whereClause.district = user.district;
            whereClause.school = user.school;
        } else if (user.role === 'Coordenador' || user.role === 'Pedagogo') {
            // Coordenador e Pedagogo veem Professor e Aluno da mesma school e district
            whereClause.district = user.district;
            whereClause.school = user.school;
        } else {
            // Professor e Aluno veem apenas dados próprios (mesma school e district)
            whereClause.district = user.district;
            whereClause.school = user.school;
        }

        const users = await User.findAll({
            where: whereClause
        });

        // Ordenando os usuários
        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.render('users', {
            title: 'Usuários',
            user: user,
            users: sortedUsers
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).send('Erro ao carregar os usuários');
    }
};


module.exports = {
    renderUsersPage,
};
