const User = require('../models/User');
const District = require('../models/District');
const School = require('../models/School');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');

const renderUsersPage = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        const districts = await District.findAll();
        const schools = await School.findAll();

        let whereClause = {};

        if (user.role === 'Master') {
            whereClause = {};
        } else if (user.role === 'Inspetor') {
            whereClause.districtId = user.districtId;
        } else if (user.role === 'Diretor' || user.role === 'Coordenador' || user.role === 'Pedagogo') {
            whereClause.districtId = user.districtId;
            whereClause.schoolId = user.schoolId;
        } else {
            whereClause.districtId = user.districtId;
            whereClause.schoolId = user.schoolId;
        }

        const users = await User.findAll({
            where: whereClause,
        });

        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Buscar o usuário a ser editado (se o userId for fornecido)
        let editingUser = null;
        if (req.query.userId) {
            editingUser = await User.findByPk(req.query.userId);
        }

        res.render('users', {
            title: 'Usuários',
            user: user,
            users: sortedUsers,
            districts: districts,
            schools: schools,
            editingUser: editingUser, // Adicionado editingUser
            selectedDistrict: user.districtId,
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).send('Erro ao carregar os usuários');
    }
};

module.exports = {
    renderUsersPage,
};