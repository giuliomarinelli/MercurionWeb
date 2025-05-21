import { SocketGateway } from './socket.io.gateway';

describe('SocketGateway', () => {
  it('should create the gateway with required services', () => {
    const gateway = new SocketGateway({} as any, {} as any, { get: () => 0 } as any);
    expect(gateway).toBeInstanceOf(SocketGateway);
  });
});
