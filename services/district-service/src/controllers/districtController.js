const District = require('../models/District');
const schoolService = require('../services/schoolService');
const cacheService = require('../services/cacheService');
const { validateDistrict, validateId } = require('../validators/districtValidator');
const AppError = require('../errors/AppError');
const logger = require('../utils/logger');

const SCHOOL_SERVICE_UNAVAILABLE_MESSAGE = 'Serviço de escolas indisponível. As informações de escolas não puderam ser carregadas.';

exports.getDistrictById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { error: idError } = validateId(id);
        if (idError) {
            throw new AppError('ID inválido', 400, idError.details[0].message);
        }

        const cacheKey = `district:${id}`;
        const cachedDistrict = await cacheService.get(cacheKey);
        if (cachedDistrict) {
            return res.json(cachedDistrict);
        }

        const district = await District.findByPk(id);
        if (!district) {
            throw new AppError('Distrito não encontrado', 404);
        }

        let districtSchools = [];
        let schoolServiceStatus = 'UP';
        try {
            const accessToken = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
            console.log('Esse é o token dos tokens:', accessToken); // ADICIONE ESTE LOG
            const schools = await schoolService.getAllSchools(accessToken);
            console.log("Resposta do schoolService (getDistrictById):", schoolsResponse); // ADICIONE ESTE LOG
            districtSchools = schools.filter(school => school.districtId === district.id);
        } catch (error) {
            logger.error('Erro ao obter escolas do schoolService:', error.message);
            schoolServiceStatus = 'DOWN';
        }

        const result = {
            ...district.toJSON(),
            schools: districtSchools,
            ...(schoolServiceStatus === 'DOWN' && { warning: SCHOOL_SERVICE_UNAVAILABLE_MESSAGE })
        };

        await cacheService.set(cacheKey, result);

        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.getAllDistricts = async (req, res, next) => {
    try {
        const { page, limit, offset, sortBy, sortOrder } = req.pagination;

        const cacheKey = `districts:${page}:${limit}:${sortBy}:${sortOrder}`;
        const cachedDistricts = await cacheService.get(cacheKey);
        if (cachedDistricts) {
            return res.json(cachedDistricts);
        }

        const { count, rows: districts } = await District.findAndCountAll({
            limit,
            offset,
            order: [[sortBy, sortOrder]]
        });

        let allSchools = [];
        let schoolServiceStatus = 'UP';
        try {
            const schoolsResponse = await schoolService.getAllSchools();
            console.log("Resposta do schoolService (getAllDistricts):", schoolsResponse); // ADICIONE ESTE LOG
            allSchools = await schoolService.getAllSchools();
        } catch (error) {
            logger.error('Erro ao obter escolas do schoolService:', error.message);
            schoolServiceStatus = 'DOWN';
        }

        const districtsWithSchools = districts.map(district => ({
            ...district.toJSON(),
            schools: allSchools.filter(school => school.districtId === district.id)
        }));

        const result = {
            data: districtsWithSchools,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            },
            ...(schoolServiceStatus === 'DOWN' && { warning: SCHOOL_SERVICE_UNAVAILABLE_MESSAGE })
        };

        await cacheService.set(cacheKey, result);

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Criar um novo distrito (Apenas Master)
exports.createDistrict = async (req, res, next) => {
    try {
        const { error, value } = validateDistrict(req.body);
        if (error) {
            throw new AppError('Dados inválidos', 400, error.details.map(detail => detail.message));
        }

        const district = await District.create(value);

        await cacheService.clearPattern('districts:*');

        res.status(201).json(district);
    } catch (error) {
        next(error);
    }
};

exports.updateDistrict = async (req, res, next) => {
    try {
        const { id } = req.params;

        const validationResult = validateId(id); // Obtenha o objeto de validação completo
        if (validationResult.error) {
            throw new AppError('ID inválido', 400, validationResult.error.details[0].message);
        }
        const validatedId = validationResult.value; // Use o ID validado (opcional, mas boa prática)

        const { error, value } = validateDistrict(req.body);
        if (error) {
            throw new AppError('Dados inválidos', 400, error.details.map(detail => detail.message));
        }

        const district = await District.findByPk(validatedId); // Use validatedId aqui
        if (!district) {
            throw new AppError('Distrito não encontrado', 404);
        }

        await district.update(value);

        await cacheService.del(`district:${validatedId}`);
        await cacheService.clearPattern('districts:*');

        res.json(district);
    } catch (error) {
        next(error);
    }
};

// Excluir um distrito (Apenas Master)
exports.deleteDistrict = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { error: idError } = validateId(id);
        if (idError) {
            throw new AppError('ID inválido', 400, idError.details[0].message);
        }

        const district = await District.findByPk(id);
        if (!district) {
            throw new AppError('Distrito não encontrado', 404);
        }

        let districtSchools = [];
        let schoolServiceStatus = 'UP';
        try {
            const schools = await schoolService.getAllSchools();
            districtSchools = schools.filter(school => school.districtId === district.id);
        } catch (error) {
            logger.error('Erro ao obter escolas do schoolService para exclusão:', error.message);
            schoolServiceStatus = 'DOWN';
            // Decidimos permitir a exclusão mesmo se o serviço de escolas estiver indisponível
            // pois a integridade referencial pode ser gerenciada de outras formas ou não ser estrita.
            // Se a exclusão NÃO deve ser permitida, podemos adicionar uma condição aqui.
        }

        if (districtSchools.length > 0 && schoolServiceStatus === 'UP') {
            throw new AppError('Não é possível excluir o distrito pois existem escolas vinculadas a ele', 400);
        } else if (districtSchools.length > 0 && schoolServiceStatus === 'DOWN') {
            logger.warn(`Tentativa de excluir distrito com escolas vinculadas, mas o serviço de escolas está indisponível.`);
        }

        await district.destroy();

        await cacheService.del(`district:${id}`);
        await cacheService.clearPattern('districts:*');

        res.json({ message: "Distrito excluído com sucesso", ...(schoolServiceStatus === 'DOWN' && { warning: SCHOOL_SERVICE_UNAVAILABLE_MESSAGE }) });
    } catch (error) {
        next(error);
    }
};