import { expect } from 'chai';
import sinon from 'sinon';
import { featureController } from '../../src/controllers/featureController.js';
import { featureService } from '../../src/services/featureService.js';

describe('Feature Controller', () => {
    beforeEach(() => {
        sinon.restore();
    });

    describe('createFeature', () => {
        it('should create a feature successfully', async () => {
            const req = {
                body: {
                    name: 'Relatórios',
                    description: 'Acesso aos relatórios do sistema'
                }
            };
            
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            const mockFeature = {
                id: 1,
                name: 'Relatórios',
                description: 'Acesso aos relatórios do sistema',
                status: 'active'
            };

            sinon.stub(featureService, 'createFeature').resolves(mockFeature);

            await featureController.createFeature(req, res);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledWith(mockFeature)).to.be.true;
        });

        it('should return 400 when name is missing', async () => {
            const req = {
                body: {
                    description: 'Acesso aos relatórios do sistema'
                }
            };
            
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await featureController.createFeature(req, res);

            expect(res.status.calledWith(400)).to.be.true;
            expect(res.json.calledWith({ 
                error: 'Nome da feature é obrigatório' 
            })).to.be.true;
        });

        it('should handle database errors', async () => {
            const req = {
                body: {
                    name: 'Relatórios',
                    description: 'Acesso aos relatórios'
                }
            };
            
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            sinon.stub(featureService, 'createFeature')
                .rejects(new Error('Database error'));

            await featureController.createFeature(req, res);

            expect(res.status.calledWith(500)).to.be.true;
            expect(res.json.calledWith({ 
                error: 'Erro ao criar feature' 
            })).to.be.true;
        });
    });

    describe('assignFeatureToUser', () => {
        it('should assign feature to user successfully', async () => {
            const req = {
                body: {
                    userId: 1,
                    featureId: 1
                },
                user: {
                    id: 2 // admin user making the assignment
                }
            };
            
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            const mockUserFeature = {
                id: 1,
                user_id: 1,
                feature_id: 1,
                granted_by: 2,
                status: 'active'
            };

            sinon.stub(featureService, 'assignFeatureToUser').resolves(mockUserFeature);

            await featureController.assignFeatureToUser(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith(mockUserFeature)).to.be.true;
        });

        it('should return 400 when missing required fields', async () => {
            const req = {
                body: {},
                user: { id: 2 }
            };
            
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await featureController.assignFeatureToUser(req, res);

            expect(res.status.calledWith(400)).to.be.true;
            expect(res.json.calledWith({ 
                error: 'userId e featureId são obrigatórios' 
            })).to.be.true;
        });
    });
});