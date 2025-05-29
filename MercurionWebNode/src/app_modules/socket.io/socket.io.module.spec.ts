import { SocketIoModule } from './socket.io.module';

describe('SocketIoModule', () => {
  it('should be defined', () => {
    expect(new SocketIoModule()).toBeDefined();
  });
});
