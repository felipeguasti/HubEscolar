const usersService = require('../services/usersService');
const districtsService = require('../services/districtService');
const schoolsService = require('../services/schoolService');
const Grade = require('../../services/school-service/src/models/Grade'); // Mantém a importação do modelo Grade

const renderUsersPage = async (req, res) => {
    try {
        // Obter informações do usuário logado (do auth-service via middleware)
        const loggedInUser = req.user;

        // Chamar o users-service para obter a lista de usuários
        let users = await usersService.getAllUsers(req.headers.authorization?.split(' ')[1]);

        // Filtrar usuários com base na role (isso idealmente estaria no users-service)
        let filteredUsers = users;
        if (loggedInUser.role !== 'Master') {
            filteredUsers = await usersService.getFilteredUsers(loggedInUser.role, loggedInUser.districtId, loggedInUser.schoolId, req.headers.authorization?.split(' ')[1]);
        }

        // Chamar o districts-service para obter a lista de distritos
        const districts = await districtsService.getAllDistricts(1, 1000, req.headers.authorization?.split(' ')[1]);

        // Chamar o schools-service para obter a lista de escolas
        const schools = await schoolsService.getAllSchools(req.headers.authorization?.split(' ')[1]);

        // Buscar as notas diretamente do banco de dados local
        const grades = await Grade.findAll();

        // Buscar o usuário a ser editado (se o userId for fornecido)
        let editingUser = null;
        if (req.query.userId) {
            editingUser = await usersService.getUserById(req.query.userId, req.headers.authorization?.split(' ')[1]);
        }

        res.render('users', {
            title: 'Usuários',
            user: loggedInUser,
            users: filteredUsers,
            districts: districts.results || districts,
            schools: schools,
            grades: grades,
            editingUser: editingUser,
            selectedDistrict: loggedInUser.districtId,
            selectedSchool: loggedInUser.schoolId,
            userRole: loggedInUser.role,
            currentUserId: loggedInUser.id
        });
    } catch (err) {
        console.error('Erro ao buscar dados para a página de usuários:', err);
        res.status(500).send('Erro ao carregar a página de usuários');
    }
};

// As outras funções (renderSchoolPage e renderDistrictsPage) já estavam corretas
const renderSchoolPage = async (req, res) => {
    try {
        const schools = await schoolsService.getAllSchools(req.headers.authorization?.split(' ')[1]);
        res.render("school", { schools });
    } catch (err) {
        console.error("Erro ao carregar as escolas:", err);
        res.status(500).send("Erro ao carregar as escolas");
    }
};

// const renderDistrictsPage = async (req, res) => {
//     try {
//         const districts = await districtsService.getAllDistricts(1, 1000, req.headers.authorization?.split(' ')[1]);
//         const schools = await schoolsService.getAllSchools(req.headers.authorization?.split(' ')[1]);
//         res.render("districts", {
//             title: "Distritos",
//             districts: districts.results || districts,
//             schools: schools,
//             user: req.user,
//         });
//     } catch (err) {
//         console.error("Erro ao buscar distritos e escolas:", err);
//         res.status(500).send("Erro ao carregar os distritos");
//     }
// };

module.exports = {
    renderUsersPage,
    renderSchoolPage,
    // renderDistrictsPage,
};