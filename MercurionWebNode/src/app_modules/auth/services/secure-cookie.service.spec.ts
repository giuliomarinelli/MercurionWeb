import { Test, TestingModule } from '@nestjs/testing';
import { SecureCookieService } from './secure-cookie.service';

describe('SecureCookieService', () => {
  let service: SecureCookieService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecureCookieService],
    }).compile();

    service = module.get<SecureCookieService>(SecureCookieService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
