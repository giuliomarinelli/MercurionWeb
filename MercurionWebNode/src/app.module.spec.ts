import { AppModule } from './app.module';

import { Test } from '@nestjs/testing';

describe('AppModule', () => {
  it('should compile the root application module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
