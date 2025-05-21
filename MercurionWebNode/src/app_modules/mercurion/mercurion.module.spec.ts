import { MercurionModule } from './mercurion.module';

import { Test } from '@nestjs/testing';

describe('MercurionModule', () => {
  it('should compile the Mercurion messaging module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MercurionModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
