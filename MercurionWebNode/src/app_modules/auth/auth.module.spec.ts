import { AuthModule } from './auth.module';

import { Test } from '@nestjs/testing';

describe('AuthModule', () => {
  it('should compile the authentication module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
