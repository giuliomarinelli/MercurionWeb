import { MeilisearchModule } from './meilisearch.module';

import { Test } from '@nestjs/testing';

describe('MeilisearchModule', () => {
  it('should compile the search module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MeilisearchModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
