const User = require('../models/User');
const District = require('../models/District');
const School = require('../models/School');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');


const renderUsersPage = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        // Recupera todos os distritos
        const districts = await District.findAll(); 

        // Recupera todas as escolas (ajuste conforme a sua necessidade)
        const schools = await School.findAll(); 

        let whereClause = {};

        if (user.role === 'Master') {
            whereClause = {};
        } else if (user.role === 'Inspetor') {
            whereClause.district = user.district;
        } else if (user.role === 'Diretor') {
            whereClause.district = user.district;
            whereClause.school = user.school;
        } else if (user.role === 'Coordenador' || user.role === 'Pedagogo') {
            whereClause.district = user.district;
            whereClause.school = user.school;
        } else {
            whereClause.district = user.district;
            whereClause.school = user.school;
        }

        const users = await User.findAll({
            where: whereClause
        });

        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Renderiza a página e passa também os distritos e escolas
        res.render('users', {
            title: 'Usuários',
            user: user,
            users: sortedUsers,
            districts: districts,
            schools: schools, // Passando escolas para o EJS
            selectedDistrict: user.district
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).send('Erro ao carregar os usuários');
    }
};

module.exports = {
    renderUsersPage,
};
