import { expect } from 'chai';
import sinon from 'sinon';
import { Feature } from '../../src/models/Feature.js';
import { UserFeature } from '../../src/models/User_feature.js';
import { featureService } from '../../src/services/featureService.js';

describe('Feature Service', () => {
    beforeEach(() => {
        sinon.restore();
    });

    describe('checkUserHasFeature', () => {
        it('should return true when user has feature', async () => {
            const mockFeature = { 
                id: 1, 
                name: 'Relatórios',
                status: 'active' 
            };
            
            const mockUserFeature = { 
                id: 1, 
                user_id: 1, 
                feature_id: 1,
                status: 'active'
            };

            sinon.stub(Feature, 'findOne').resolves(mockFeature);
            sinon.stub(UserFeature, 'findOne').resolves(mockUserFeature);

            const result = await featureService.checkUserHasFeature(1, 'Relatórios');
            expect(result).to.be.true;
        });

        it('should return false when feature does not exist', async () => {
            sinon.stub(Feature, 'findOne').resolves(null);

            const result = await featureService.checkUserHasFeature(1, 'NonExistentFeature');
            expect(result).to.be.false;
        });
    });
});