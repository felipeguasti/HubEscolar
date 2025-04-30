import { expect } from 'chai';
import sinon from 'sinon';
import { hasFeature } from '../../src/middlewares/featureCheck.js';
import { featureService } from '../../src/services/featureService.js';

describe('Feature Middleware', () => {
    beforeEach(() => {
        sinon.restore();
    });

    it('should allow access when user has feature', async () => {
        const req = {
            user: {
                id: 1,
                role: 'User'
            }
        };
        
        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };

        const next = sinon.spy();

        sinon.stub(featureService, 'checkUserHasFeature').resolves(true);

        await hasFeature('Relatórios')(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(res.status.called).to.be.false;
    });

    it('should skip check for Master users', async () => {
        const req = {
            user: {
                id: 1,
                role: 'Master'
            }
        };
        
        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };

        const next = sinon.spy();
        const checkStub = sinon.stub(featureService, 'checkUserHasFeature');

        await hasFeature('Relatórios')(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(checkStub.called).to.be.false;
    });

    it('should deny access when user does not have feature', async () => {
        const req = {
            user: {
                id: 1,
                role: 'User'
            }
        };
        
        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };

        const next = sinon.spy();

        sinon.stub(featureService, 'checkUserHasFeature').resolves(false);

        await hasFeature('Relatórios')(req, res, next);

        expect(next.called).to.be.false;
        expect(res.status.calledWith(403)).to.be.true;
        expect(res.json.calledWith({
            error: 'Acesso não autorizado',
            message: 'Você não tem acesso a esta funcionalidade'
        })).to.be.true;
    });
});