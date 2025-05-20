import { SocketIoModule } from './socket.io.module';

import { Test } from '@nestjs/testing';

describe('SocketIoModule', () => {
  it('should compile the socket module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SocketIoModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
