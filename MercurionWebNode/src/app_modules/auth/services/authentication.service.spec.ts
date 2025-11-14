import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(() => {
    service = new AuthenticationService(
      {} as any, // passwordEncoder
      {} as any, // userService
      {} as any, // sessionService
      {} as any, // securityService
      {} as any, // mfaService
      {} as any, // jwtTools
      {} as any, // responseService
      {} as any, // geoIpService
      {} as any, // redisService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
