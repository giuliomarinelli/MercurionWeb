import { ToxicityViewEntity } from './toxicity-view.entity';

describe('ToxicityViewEntity', () => {
  it('should instantiate the toxicity view', () => {
    const entity = new ToxicityViewEntity();
    expect(entity).toBeInstanceOf(ToxicityViewEntity);
  });
});
