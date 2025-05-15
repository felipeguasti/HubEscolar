import { expect } from 'chai';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app-auth-service.js';
import { sequelize } from '../../src/config/db.js';
import { Feature } from '../../src/models/Feature.js';
import { UserFeature } from '../../src/models/User_feature.js';

const generateTestToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
};

describe('Feature Integration Tests', () => {
    before(async () => {
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await Feature.destroy({ where: {} });
        await UserFeature.destroy({ where: {} });
    });

    describe('POST /features/create', () => {
        it('should create a new feature when user is Master', async () => {
            const mockUser = {
                id: 1,
                role: 'Master'
            };

            const response = await request(app)
                .post('/features/create')
                .set('Authorization', `Bearer ${generateTestToken(mockUser)}`)
                .send({
                    name: 'Relatórios',
                    description: 'Acesso aos relatórios do sistema'
                });

            expect(response.status).to.equal(201);
            expect(response.body).to.have.property('name', 'Relatórios');
            expect(response.body).to.have.property('description', 'Acesso aos relatórios do sistema');
        });

        it('should return 403 when user is not Master or Inspector', async () => {
            const mockUser = {
                id: 1,
                role: 'User'
            };

            const response = await request(app)
                .post('/features/create')
                .set('Authorization', `Bearer ${generateTestToken(mockUser)}`)
                .send({
                    name: 'Relatórios',
                    description: 'Acesso aos relatórios do sistema'
                });

            expect(response.status).to.equal(403);
            expect(response.body).to.have.property('error', 'Acesso não autorizado');
        });

        it('should return 401 when no token is provided', async () => {
            const response = await request(app)
                .post('/features/create')
                .send({
                    name: 'Relatórios',
                    description: 'Acesso aos relatórios do sistema'
                });

            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('message', 'Token não fornecido.');
        });
    });
});