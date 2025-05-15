jest.mock('../../../../../src/config/db', () => ({
    authenticate: jest.fn(() => Promise.resolve()), // Simula a autenticação com sucesso
    define: jest.fn(() => ({ // Simula a definição de um model
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
    })),
    // Adicione outros métodos do Sequelize que seu controller possa usar
}));
jest.mock('../../services/schoolService', () => ({
    __esModule: true, // Importante para módulos ES6
    default: {
        getAllSchools: jest.fn(() => Promise.resolve([])),
        getSchoolById: jest.fn(() => Promise.resolve(null)),
    },
}));
const districtController = require('../districtController');
const District = require('../../models/District');
const cacheService = require('../../services/cacheService');
const { validateId, validateDistrict } = require('../../validators/districtValidator');
const AppError = require('../../errors/AppError');
const logger = require('../../utils/logger');

jest.mock('../../models/District');
jest.mock('../../services/schoolService');
jest.mock('../../services/cacheService');
jest.mock('../../validators/districtValidator');
jest.mock('../../utils/logger');

describe('districtController', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        // Agora você pode resetar os mocks do District diretamente
        District.findByPk.mockReset();
        District.findAndCountAll.mockReset();
        District.create.mockReset();
        District.update.mockReset();
        District.destroy.mockReset();
        require('../../services/schoolService').default.getAllSchools.mockReset();
        require('../../services/schoolService').default.getSchoolById.mockReset();
        cacheService.get.mockReset();
        cacheService.set.mockReset();
        cacheService.clearPattern.mockReset();
        validateId.mockReset();
        validateDistrict.mockReset();
        logger.info.mockReset();
        logger.error.mockReset();

        mockReq = { params: {}, body: {}, query: {}, pagination: {} };
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        mockNext = jest.fn();
    });
    
        describe('getDistrictById', () => {
            it('should return district from cache if found', async () => {
                const cachedDistrict = { id: '1', name: 'Test District', schools: [] };
                cacheService.get.mockResolvedValue(cachedDistrict);
                validateId.mockReturnValue({ error: null });
                mockReq.params.id = '1';
    
                await districtController.getDistrictById(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('1');
                expect(cacheService.get).toHaveBeenCalledWith('district:1');
                expect(mockRes.json).toHaveBeenCalledWith(cachedDistrict);
                expect(District.findByPk).not.toHaveBeenCalled();
                expect(require('../../services/schoolService').default.getAllSchools).not.toHaveBeenCalled();
            });
    
            it('should return district from database and cache if not found in cache', async () => {
                const districtFromDb = { id: 1, name: 'Test District', toJSON: () => ({ id: 1, name: 'Test District' }) };
                const schools = [{ id: 101, name: 'School A', districtId: 1 }];
                District.findByPk.mockResolvedValue(districtFromDb);
                require('../../services/schoolService').default.getAllSchools.mockResolvedValue(schools);
                validateId.mockReturnValue({ error: null });
                mockReq.params.id = '1';
            
                console.log('findByPk mock calls:', District.findByPk.mock.calls);
                console.log('getAllSchools mock calls:', require('../../services/schoolService').default.getAllSchools.mock.calls);
                console.log('cacheService.set mock calls:', cacheService.set.mock.calls);

                await districtController.getDistrictById(mockReq, mockRes, mockNext);

                console.log('mockRes.json mock calls:', mockRes.json.mock.calls);

                expect(validateId).toHaveBeenCalledWith('1');
                expect(cacheService.get).toHaveBeenCalledWith('district:1');
                expect(District.findByPk).toHaveBeenCalledWith('1');
                expect(require('../../services/schoolService').default.getAllSchools).toHaveBeenCalledWith();
                expect(cacheService.set).toHaveBeenCalledWith('district:1', { id: 1, name: 'Test District', schools: schools });
                expect(mockRes.json).toHaveBeenCalledWith({ id: 1, name: 'Test District', schools: schools });
            });
    
            it('should return 404 if district not found in database', async () => {
                District.findByPk.mockResolvedValue(null);
                validateId.mockReturnValue({ error: null });
                mockReq.params.id = '1';
    
                await districtController.getDistrictById(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('1');
                expect(cacheService.get).toHaveBeenCalledWith('district:1');
                expect(District.findByPk).toHaveBeenCalledWith('1');
                expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
                const error = mockNext.mock.calls[0][0];
                expect(error.statusCode).toBe(404);
                expect(error.message).toBe('Distrito não encontrado');
            });
    
            it('should return 400 if ID is invalid', async () => {
                const idError = { details: [{ message: 'ID must be a number' }] };
                validateId.mockReturnValue({ error: idError });
                mockReq.params.id = 'invalid';
    
                await districtController.getDistrictById(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('invalid');
                expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
                const error = mockNext.mock.calls[0][0];
                expect(error.statusCode).toBe(400);
                expect(error.message).toBe('ID inválido');
                expect(error.details).toEqual('ID must be a number');
                expect(cacheService.get).not.toHaveBeenCalled();
                expect(District.findByPk).not.toHaveBeenCalled();
            });
        });
    
        describe('getAllDistricts', () => {
            it('should return districts from cache if found', async () => {
                const cachedDistricts = { data: [{ id: 1, name: 'A', schools: [] }], pagination: {} };
                cacheService.get.mockResolvedValue(cachedDistricts);
                mockReq.pagination = { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' };
    
                await districtController.getAllDistricts(mockReq, mockRes, mockNext);
    
                expect(cacheService.get).toHaveBeenCalledWith('districts:1:10:name:asc');
                expect(mockRes.json).toHaveBeenCalledWith(cachedDistricts);
                expect(District.findAndCountAll).not.toHaveBeenCalled();
                expect(require('../../services/schoolService').default.getAllSchools).not.toHaveBeenCalled();
            });
    
            it('should return districts from database and cache if not found in cache', async () => {
                const districtsFromDb = { count: 1, rows: [{ id: 1, name: 'A', toJSON: () => ({ id: 1, name: 'A' }) }] };
                const schools = [{ id: 101, name: 'School X', districtId: 1 }];
                District.findAndCountAll.mockResolvedValue(districtsFromDb);
                require('../../services/schoolService').default.getAllSchools.mockResolvedValue(schools);
                mockReq.pagination = { page: 1, limit: 10, offset: 0, sortBy: 'name', sortOrder: 'asc' };
    
                await districtController.getAllDistricts(mockReq, mockRes, mockNext);
    
                expect(cacheService.get).toHaveBeenCalledWith('districts:1:10:name:asc');
                expect(District.findAndCountAll).toHaveBeenCalledWith({ limit: 10, offset: 0, order: [['name', 'asc']] });
                expect(require('../../services/schoolService').default.getAllSchools).toHaveBeenCalled();
                expect(cacheService.set).toHaveBeenCalledWith('districts:1:10:name:asc', { data: [{ id: 1, name: 'A', schools: schools }], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });
                expect(mockRes.json).toHaveBeenCalledWith({ data: [{ id: 1, name: 'A', schools: schools }], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });
            });
    
            it('should handle errors during database retrieval', async () => {
                const dbError = new Error('Database error');
                District.findAndCountAll.mockRejectedValue(dbError);
                mockReq.pagination = { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' };
                cacheService.get.mockResolvedValue(null);
    
                await districtController.getAllDistricts(mockReq, mockRes, mockNext);
    
                expect(cacheService.get).toHaveBeenCalledWith('districts:1:10:name:asc');
                expect(District.findAndCountAll).toHaveBeenCalledWith({ limit: 10, offset: 0, order: [['name', 'asc']] });
                expect(mockNext).toHaveBeenCalledWith(dbError);
            });
    
            it('should handle errors during school service retrieval', async () => {
                const serviceError = new Error('School service error');
                District.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
                require('../../services/schoolService').default.getAllSchools.mockRejectedValue(serviceError);
                mockReq.pagination = { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' };
                cacheService.get.mockResolvedValue(null);
    
                await districtController.getAllDistricts(mockReq, mockRes, mockNext);
    
                expect(cacheService.get).toHaveBeenCalledWith('districts:1:10:name:asc');
                expect(District.findAndCountAll).toHaveBeenCalledWith({ limit: 10, offset: 0, order: [['name', 'asc']] });
                expect(require('../../services/schoolService').default.getAllSchools).toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(serviceError);
            });
        });
    
        describe('createDistrict', () => {
            it('should create a new district and return 201', async () => {
                const validDistrictData = { name: 'New District' };
                const createdDistrict = { id: 2, name: 'New District' };
                validateDistrict.mockReturnValue({ error: null, value: validDistrictData });
                District.create.mockResolvedValue(createdDistrict);
                mockReq.body = validDistrictData;
    
                await districtController.createDistrict(mockReq, mockRes, mockNext);
    
                expect(validateDistrict).toHaveBeenCalledWith(validDistrictData);
                expect(District.create).toHaveBeenCalledWith(validDistrictData);
                expect(cacheService.clearPattern).toHaveBeenCalledWith('districts:*');
                expect(mockRes.status).toHaveBeenCalledWith(201);
                expect(mockRes.json).toHaveBeenCalledWith(createdDistrict);
            });
    
            it('should return 400 if validation fails', async () => {
                const invalidDistrictData = { name: '' };
                const validationError = { details: [{ message: 'Name is required' }] };
                validateDistrict.mockReturnValue({ error: validationError, value: invalidDistrictData });
                mockReq.body = invalidDistrictData;
    
                await districtController.createDistrict(mockReq, mockRes, mockNext);
    
                expect(validateDistrict).toHaveBeenCalledWith(invalidDistrictData);
                expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
                const error = mockNext.mock.calls[0][0];
                expect(error.statusCode).toBe(400);
                expect(error.message).toBe('Dados inválidos');
                expect(error.details).toEqual(['Name is required']);
                expect(District.create).not.toHaveBeenCalled();
                expect(cacheService.clearPattern).not.toHaveBeenCalled();
            });
    
            it('should handle errors during district creation', async () => {
                const validDistrictData = { name: 'New District' };
                const dbError = new Error('Database error');
                validateDistrict.mockReturnValue({ error: null, value: validDistrictData });
                District.create.mockRejectedValue(dbError);
                mockReq.body = validDistrictData;
    
                await districtController.createDistrict(mockReq, mockRes, mockNext);
    
                expect(validateDistrict).toHaveBeenCalledWith(validDistrictData);
                expect(District.create).toHaveBeenCalledWith(validDistrictData);
                expect(cacheService.clearPattern).not.toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(dbError);
            });
        });
    
        describe('updateDistrict', () => {
            it('should update a district and return the updated district', async () => {
                const districtFromDb = { id: '1', name: 'Old Name', update: jest.fn().mockResolvedValue([1]) };
                const validUpdateData = { name: 'New Name' };
                validateId.mockReturnValue({ error: null });
                validateDistrict.mockReturnValue({ error: null, value: validUpdateData });
                District.findByPk.mockResolvedValue(districtFromDb);
                mockReq.params.id = '1';
                mockReq.body = validUpdateData;
    
                await districtController.updateDistrict(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('1');
                expect(validateDistrict).toHaveBeenCalledWith(validUpdateData);
                expect(District.findByPk).toHaveBeenCalledWith('1');
                expect(districtFromDb.update).toHaveBeenCalledWith(validUpdateData);
                expect(cacheService.del).toHaveBeenCalledWith('district:1');
                expect(cacheService.clearPattern).toHaveBeenCalledWith('districts:*');
                expect(mockRes.json).toHaveBeenCalledWith({ id: '1', name: 'New Name' });
            });
    
            it('should return 400 if ID validation fails', async () => {
                const idError = { details: [{ message: 'Invalid ID format' }] };
                validateId.mockReturnValue({ error: idError });
                mockReq.params.id = 'invalid';
    
                await districtController.updateDistrict(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('invalid');
                expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
                const error = mockNext.mock.calls[0][0];
                expect(error.statusCode).toBe(400);
                expect(error.message).toBe('ID inválido');
                expect(error.details).toEqual('Invalid ID format');
                expect(District.findByPk).not.toHaveBeenCalled();
            });
    
            it('should return 400 if data validation fails', async () => {
                validateId.mockReturnValue({ error: null });
                const validationError = { details: [{ message: 'Name cannot be empty' }] };
                validateDistrict.mockReturnValue({ error: validationError, value: {} });
                mockReq.params.id = '1';
                mockReq.body = {};
    
                await districtController.updateDistrict(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('1');
                expect(validateDistrict).toHaveBeenCalledWith({});
                expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
                const error = mockNext.mock.calls[0][0];
                expect(error.statusCode).toBe(400);
                expect(error.message).toBe('Dados inválidos');
                expect(error.details).toEqual(['Name cannot be empty']);
                expect(District.findByPk).not.toHaveBeenCalled();
            });
    
            it('should return 404 if district not found', async () => {
                validateId.mockReturnValue({ error: null });
                validateDistrict.mockReturnValue({ error: null, value: { name: 'New Name' } });
                District.findByPk.mockResolvedValue(null);
                mockReq.params.id = '1';
                mockReq.body = { name: 'New Name' };
    
                await districtController.updateDistrict(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('1');
                expect(validateDistrict).toHaveBeenCalledWith({ name: 'New Name' });
                expect(District.findByPk).toHaveBeenCalledWith('1');
                expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
                const error = mockNext.mock.calls[0][0];
                expect(error.statusCode).toBe(404);
                expect(error.message).toBe('Distrito não encontrado');
            });
    
            it('should handle errors during database update', async () => {
                const districtFromDb = { id: '1', name: 'Old Name', update: jest.fn().mockRejectedValue(new Error('Update failed')) };
                validateId.mockReturnValue({ error: null });
                validateDistrict.mockReturnValue({ error: null, value: { name: 'New Name' } });
                District.findByPk.mockResolvedValue(districtFromDb);
                mockReq.params.id = '1';
                mockReq.body = { name: 'New Name' };
    
                await districtController.updateDistrict(mockReq, mockRes, mockNext);
    
                expect(validateId).toHaveBeenCalledWith('1');
                expect(validateDistrict).toHaveBeenCalledWith({ name: 'New Name' });
                expect(District.findByPk).toHaveBeenCalledWith('1');
                expect(districtFromDb.update).toHaveBeenCalledWith({ name: 'New Name' });
                expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
                expect(cacheService.del).toHaveBeenCalledWith('district:1');
                expect(cacheService.clearPattern).toHaveBeenCalledWith('districts:*');
            });
        });
    
        describe('deleteDistrict', () => {
            it('should delete a district and return success message', async () => {
                const districtToDelete = { id: '1', destroy: jest.fn().mockResolvedValue(1) };
                validateId.mockReturnValue({ error: null });
                District.findByPk.mockResolvedValue(districtToDelete);
                require('../../services/schoolService').default.getAllSchools.mockResolvedValue([]);
                mockReq.params.id = '1';

            await districtController.deleteDistrict(mockReq, mockRes, mockNext);

            expect(validateId).toHaveBeenCalledWith('1');
            expect(District.findByPk).toHaveBeenCalledWith('1');
            expect(require('../../services/schoolService').default.getAllSchools).toHaveBeenCalledWith({ where: { districtId: '1' } });
            expect(districtToDelete.destroy).toHaveBeenCalled();
            expect(cacheService.del).toHaveBeenCalledWith('district:1');
            expect(cacheService.clearPattern).toHaveBeenCalledWith('districts:*');
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Distrito excluído com sucesso' });
        });

        it('should return 400 if ID validation fails', async () => {
            const idError = { details: [{ message: 'Invalid ID format' }] };
            validateId.mockReturnValue({ error: idError });
            mockReq.params.id = 'invalid';

            await districtController.deleteDistrict(mockReq, mockRes, mockNext);

            expect(validateId).toHaveBeenCalledWith('invalid');
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('ID inválido');
            expect(error.details).toEqual('Invalid ID format');
            expect(District.findByPk).not.toHaveBeenCalled();
            expect(require('../../services/schoolService').default.getAllSchools).not.toHaveBeenCalled();
            expect(District.destroy).not.toHaveBeenCalled();
            expect(cacheService.del).not.toHaveBeenCalled();
            expect(cacheService.clearPattern).not.toHaveBeenCalled();
        });

        it('should return 404 if district not found', async () => {
            validateId.mockReturnValue({ error: null });
            District.findByPk.mockResolvedValue(null);
            mockReq.params.id = '1';

            await districtController.deleteDistrict(mockReq, mockRes, mockNext);

            expect(validateId).toHaveBeenCalledWith('1');
            expect(District.findByPk).toHaveBeenCalledWith('1');
            expect(require('../../services/schoolService').default.getAllSchools).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('Distrito não encontrado');
            expect(District.destroy).not.toHaveBeenCalled();
            expect(cacheService.del).not.toHaveBeenCalled();
            expect(cacheService.clearPattern).not.toHaveBeenCalled();
        });

        it('should return 400 if there are schools linked to the district', async () => {
            const districtToDelete = { id: '1', destroy: jest.fn() };
            const schoolsInDistrict = [{ id: 201, name: 'Another School', districtId: '1' }];
            validateId.mockReturnValue({ error: null });
            District.findByPk.mockResolvedValue(districtToDelete);
            require('../../services/schoolService').default.getAllSchools.mockResolvedValue(schoolsInDistrict);
            mockReq.params.id = '1';

            await districtController.deleteDistrict(mockReq, mockRes, mockNext);

            expect(validateId).toHaveBeenCalledWith('1');
            expect(District.findByPk).toHaveBeenCalledWith('1');
            expect(require('../../services/schoolService').default.getAllSchools).toHaveBeenCalledWith({ where: { districtId: '1' } });
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Não é possível excluir o distrito pois existem escolas vinculadas a ele');
            expect(districtToDelete.destroy).not.toHaveBeenCalled();
            expect(cacheService.del).not.toHaveBeenCalled();
            expect(cacheService.clearPattern).not.toHaveBeenCalled();
        });

        it('should handle errors during database destroy', async () => {
            const districtToDelete = { id: '1', destroy: jest.fn().mockRejectedValue(new Error('Destroy failed')) };
            validateId.mockReturnValue({ error: null });
            District.findByPk.mockResolvedValue(districtToDelete);
            require('../../services/schoolService').default.getAllSchools.mockResolvedValue([]);
            mockReq.params.id = '1';

            await districtController.deleteDistrict(mockReq, mockRes, mockNext);

            expect(validateId).toHaveBeenCalledWith('1');
            expect(District.findByPk).toHaveBeenCalledWith('1');
            expect(require('../../services/schoolService').default.getAllSchools).toHaveBeenCalledWith({ where: { districtId: '1' } });
            expect(districtToDelete.destroy).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
            expect(cacheService.del).toHaveBeenCalledWith('district:1');
            expect(cacheService.clearPattern).toHaveBeenCalledWith('districts:*');
        });

        it('should handle errors during school service retrieval', async () => {
            const districtToDelete = { id: '1', destroy: jest.fn() };
            validateId.mockReturnValue({ error: null });
            District.findByPk.mockResolvedValue(districtToDelete);
            require('../../services/schoolService').default.getAllSchools.mockRejectedValue(new Error('Failed to fetch schools'));
            mockReq.params.id = '1';

            await districtController.deleteDistrict(mockReq, mockRes, mockNext);

            expect(validateId).toHaveBeenCalledWith('1');
            expect(District.findByPk).toHaveBeenCalledWith('1');
            expect(require('../../services/schoolService').default.getAllSchools).toHaveBeenCalledWith({ where: { districtId: '1' } });
            expect(districtToDelete.destroy).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
            expect(cacheService.del).not.toHaveBeenCalled();
            expect(cacheService.clearPattern).not.toHaveBeenCalled();
        });
    });
});