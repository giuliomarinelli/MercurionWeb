import { Test, TestingModule } from '@nestjs/testing';
import { SocketIOGateway } from './socket.io.gateway';
import { PubSubService } from '../redis/services/pub-sub.service';

describe('SocketGateway', () => {
  let gateway: SocketIOGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketIOGateway,
        { provide: PubSubService, useValue: { setSocketServer: jest.fn() } },
      ],
    }).compile();

    gateway = module.get<SocketIOGateway>(SocketIOGateway);
  });

  it('should create the gateway with required services', () => {
    expect(gateway).toBeInstanceOf(SocketIOGateway);
  });
});
