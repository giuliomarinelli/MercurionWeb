import { NotificationModule } from './notification.module';

import { Test } from '@nestjs/testing';

describe('NotificationModule', () => {
  it('should compile the notification module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [NotificationModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
