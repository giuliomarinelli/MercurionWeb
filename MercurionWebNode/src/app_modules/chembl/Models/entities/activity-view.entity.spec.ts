import { ActivityViewEntity } from './activity-view.entity';

describe('ActivityViewEntity', () => {
  it('should create an empty view entity', () => {
    const entity = new ActivityViewEntity();
    expect(entity).toBeInstanceOf(ActivityViewEntity);
  });
});
