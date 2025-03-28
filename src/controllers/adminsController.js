const User = require('../models/User');
const District = require('../models/District');
const School = require('../models/School');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const Grade = require('../models/Grade');

const renderUsersPage = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const districts = await District.findAll();
        const schools = await School.findAll();
        const grades = await Grade.findAll();

        let whereClause = {};

        if (user.role !== 'Master') {
            if (user.role === 'Inspetor') {
                whereClause.districtId = user.districtId;
            } else if (['Diretor', 'Secretario'].includes(user.role)) {
                whereClause.schoolId = user.schoolId;
            } else if (['Pedagogo', 'Coordenador'].includes(user.role)) {
                whereClause.role = ['Professor', 'Aluno'];
                whereClause.schoolId = user.schoolId;
            } else if (user.role === 'Professor') {
                whereClause.role = 'Aluno';
                whereClause.schoolId = user.schoolId;
            } else if (user.role === 'Aluno') {
                whereClause.id = null; // Alunos não veem ninguém
            } else {
                whereClause.id = null; // Outros papéis não veem ninguém
            }
        }

        const users = await User.findAll({ where: whereClause });

        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'inactive' && b.status !== 'inactive') return -1;
            if (a.status !== 'inactive' && b.status === 'inactive') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.render('users', {
            title: 'Usuários',
            user: user,
            users: sortedUsers,
            districts: districts,
            schools: schools,
            grades: grades,
            selectedDistrict: user.districtId,
            selectedSchool: user.schoolId,
            userRole: user.role,
            currentUserId: user.id
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).send('Erro ao carregar os usuários');
    }
};

module.exports = {
    renderUsersPage,
};