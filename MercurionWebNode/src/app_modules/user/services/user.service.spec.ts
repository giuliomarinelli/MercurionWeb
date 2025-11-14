import { RpcException } from '@nestjs/microservices';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    service = new UserService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { forContext: jest.fn().mockReturnValue(loggerMock) } as any
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateScopeArray', () => {
    it('parses json array string', () => {
      const scopes = service.generateScopeArray('["a","b"]', 'JSON');
      expect(scopes).toEqual(['a', 'b']);
    });

    it('throws RpcException when json parse fails', () => {
      expect(() => service.generateScopeArray('invalid', 'JSON')).toThrow(RpcException);
    });

    it('splits jwt formatted scopes', () => {
      const scopes = service.generateScopeArray('a b c', 'JWT');
      expect(scopes).toEqual(['a', 'b', 'c']);
    });

    it('throws RpcException for malformed jwt scope string', () => {
      expect(() => service.generateScopeArray('a,b', 'JWT')).toThrow(RpcException);
    });
  });
});
