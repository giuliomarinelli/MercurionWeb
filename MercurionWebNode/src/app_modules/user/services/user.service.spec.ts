import { UserService } from './user.service';

describe('UserService', () => {
  it('should be defined', () => {
    const loggerMock = { warn: jest.fn() };
    const service = new UserService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { forContext: jest.fn().mockReturnValue(loggerMock) } as any,
    );
    expect(service).toBeDefined();
  });
});
