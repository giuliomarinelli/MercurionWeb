import { UserModule } from './user.module';

import { Test } from '@nestjs/testing';

describe('UserModule', () => {
  it('should compile the user module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UserModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
