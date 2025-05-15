const gradeService = require('../services/gradeService');
const districtService = require('../services/districtService');
const schoolService = require('../services/schoolService');
const schoolsService = require('../services/schoolService');
const Grade = require('../../services/school-service/src/models/Grade'); // Mantém a importação do modelo Grade


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

// As outras funções (renderSchoolPage e renderDistrictsPage) já estavam corretas
const renderToolsPage = async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    const districtResponse = await districtService.getAllDistricts(accessToken, 1, 0);
    const schoolResponse = await schoolService.getAllSchools(accessToken);
    const gradeResponse = await gradeService.getAllGrades(accessToken, req.query.schoolId);

    const districts = districtResponse.data || [];
    const schools = schoolResponse;
    const grades = gradeResponse.results || gradeResponse;
    const role = req.user ? req.user.role : null;

    // Criar um dicionário de distritos
    const districtMap = {};
    districts.forEach(district => {
        districtMap[district.id] = district.name;
    });

    // Criar um dicionário de escolas e associá-las ao distrito
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = {
            name: school.name,
            districtId: school.districtId,
        };
    });

    // Filtrando as escolas de acordo com o districtId do Inspetor
    let filteredSchools = schools;
    if (req.user && req.user.districtId) {
        filteredSchools = schools.filter(school => school.districtId === req.user.districtId);
    }

    const gradesWithNames = grades.map(grade => {
        const school = schoolMap[grade.schoolId] || {};
        return {
            id: grade.id,
            name: grade.name,
            schoolId: grade.schoolId,
            schoolName: school.name || null,
            districtName: districtMap[school.districtId] || null,
            districtId: school.districtId || null,
        };
    });

    // Filtrando as turmas com base no districtId do Inspetor
    let gradesToDisplay = gradesWithNames;

    if (req.user && req.user.role === 'Master' && req.query.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.query.districtId);
    } else if (req.user && req.user.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.user.districtId);
    }
    try {
        res.render("tools", {
            title: "Ferramentas",
            districts,
            role,
            schools: filteredSchools,
            grades: gradesToDisplay,
            user: req.user,
            districtId: req.query.districtId || (req.user ? req.user.districtId : null),
            districtMap: districtMap,
        });
    } catch (err) {
        console.error("Erro ao carregar as ferramentas:", err);
        res.status(500).send("Erro ao carregar as ferramentas");
    }
};

// As outras funções (renderSchoolPage e renderDistrictsPage) já estavam corretas
const renderToolsManagementPage = async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    const districtResponse = await districtService.getAllDistricts(accessToken, 1, 0);
    const schoolResponse = await schoolService.getAllSchools(accessToken);
    const gradeResponse = await gradeService.getAllGrades(accessToken, req.query.schoolId);

    const districts = districtResponse.data || [];
    const schools = schoolResponse;
    const grades = gradeResponse.results || gradeResponse;
    const role = req.user ? req.user.role : null;

    // Criar um dicionário de distritos
    const districtMap = {};
    districts.forEach(district => {
        districtMap[district.id] = district.name;
    });

    // Criar um dicionário de escolas e associá-las ao distrito
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = {
            name: school.name,
            districtId: school.districtId,
        };
    });

    // Filtrando as escolas de acordo com o districtId do Inspetor
    let filteredSchools = schools;
    if (req.user && req.user.districtId) {
        filteredSchools = schools.filter(school => school.districtId === req.user.districtId);
    }

    const gradesWithNames = grades.map(grade => {
        const school = schoolMap[grade.schoolId] || {};
        return {
            id: grade.id,
            name: grade.name,
            schoolId: grade.schoolId,
            schoolName: school.name || null,
            districtName: districtMap[school.districtId] || null,
            districtId: school.districtId || null,
        };
    });

    // Filtrando as turmas com base no districtId do Inspetor
    let gradesToDisplay = gradesWithNames;

    if (req.user && req.user.role === 'Master' && req.query.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.query.districtId);
    } else if (req.user && req.user.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.user.districtId);
    }
    try {
        res.render("management", {
            title: "Gerenciar Ferramentas",
            districts,
            role,
            schools: filteredSchools,
            grades: gradesToDisplay,
            user: req.user,
            districtId: req.query.districtId || (req.user ? req.user.districtId : null),
            districtMap: districtMap,
        });
    } catch (err) {
        console.error("Erro ao carregar as ferramentas:", err);
        res.status(500).send("Erro ao carregar as ferramentas");
    }
};

// As outras funções (renderSchoolPage e renderDistrictsPage) já estavam corretas
const renderSettingsPage = async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    const districtResponse = await districtService.getAllDistricts(accessToken, 1, 0);
    const schoolResponse = await schoolService.getAllSchools(accessToken);
    const gradeResponse = await gradeService.getAllGrades(accessToken, req.query.schoolId);

    const districts = districtResponse.data || [];
    const schools = schoolResponse;
    const grades = gradeResponse.results || gradeResponse;
    const role = req.user ? req.user.role : null;

    // Criar um dicionário de distritos
    const districtMap = {};
    districts.forEach(district => {
        districtMap[district.id] = district.name;
    });

    // Criar um dicionário de escolas e associá-las ao distrito
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = {
            name: school.name,
            districtId: school.districtId,
        };
    });

    // Filtrando as escolas de acordo com o districtId do Inspetor
    let filteredSchools = schools;
    if (req.user && req.user.districtId) {
        filteredSchools = schools.filter(school => school.districtId === req.user.districtId);
    }

    const gradesWithNames = grades.map(grade => {
        const school = schoolMap[grade.schoolId] || {};
        return {
            id: grade.id,
            name: grade.name,
            schoolId: grade.schoolId,
            schoolName: school.name || null,
            districtName: districtMap[school.districtId] || null,
            districtId: school.districtId || null,
        };
    });

    // Filtrando as turmas com base no districtId do Inspetor
    let gradesToDisplay = gradesWithNames;

    if (req.user && req.user.role === 'Master' && req.query.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.query.districtId);
    } else if (req.user && req.user.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.user.districtId);
    }
    try {
        res.render("settings", {
            title: "Configurações",
            districts,
            role,
            schools: filteredSchools,
            grades: gradesToDisplay,
            user: req.user,
            districtId: req.query.districtId || (req.user ? req.user.districtId : null),
            districtMap: districtMap,
        });
    } catch (err) {
        console.error("Erro ao carregar as ferramentas:", err);
        res.status(500).send("Erro ao carregar as ferramentas");
    }
};

// As outras funções (renderSchoolPage e renderDistrictsPage) já estavam corretas
const renderSalesPage = async (req, res) => {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    const districtResponse = await districtService.getAllDistricts(accessToken, 1, 0);
    const schoolResponse = await schoolService.getAllSchools(accessToken);
    const gradeResponse = await gradeService.getAllGrades(accessToken, req.query.schoolId);

    const districts = districtResponse.data || [];
    const schools = schoolResponse;
    const grades = gradeResponse.results || gradeResponse;
    const role = req.user ? req.user.role : null;

    // Criar um dicionário de distritos
    const districtMap = {};
    districts.forEach(district => {
        districtMap[district.id] = district.name;
    });

    // Criar um dicionário de escolas e associá-las ao distrito
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = {
            name: school.name,
            districtId: school.districtId,
        };
    });

    // Filtrando as escolas de acordo com o districtId do Inspetor
    let filteredSchools = schools;
    if (req.user && req.user.districtId) {
        filteredSchools = schools.filter(school => school.districtId === req.user.districtId);
    }

    const gradesWithNames = grades.map(grade => {
        const school = schoolMap[grade.schoolId] || {};
        return {
            id: grade.id,
            name: grade.name,
            schoolId: grade.schoolId,
            schoolName: school.name || null,
            districtName: districtMap[school.districtId] || null,
            districtId: school.districtId || null,
        };
    });

    // Filtrando as turmas com base no districtId do Inspetor
    let gradesToDisplay = gradesWithNames;

    if (req.user && req.user.role === 'Master' && req.query.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.query.districtId);
    } else if (req.user && req.user.districtId) {
        gradesToDisplay = gradesWithNames.filter(grade => grade.districtId === req.user.districtId);
    }
    try {
        res.render("sales", {
            title: "Vendas",
            districts,
            role,
            schools: filteredSchools,
            grades: gradesToDisplay,
            user: req.user,
            districtId: req.query.districtId || (req.user ? req.user.districtId : null),
            districtMap: districtMap,
        });
    } catch (err) {
        console.error("Erro ao carregar as ferramentas:", err);
        res.status(500).send("Erro ao carregar as ferramentas");
    }
};

module.exports = {
    renderSchoolPage,
    renderToolsPage,
    renderSettingsPage,
    renderToolsManagementPage,
    renderSalesPage
};