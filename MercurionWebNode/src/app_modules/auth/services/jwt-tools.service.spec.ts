import { JwtToolsService } from './jwt-tools.service';

describe('JwtToolsService', () => {
  let service: JwtToolsService;

  beforeEach(() => {
    service = new JwtToolsService(
      {} as any,
      { get: () => undefined } as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
