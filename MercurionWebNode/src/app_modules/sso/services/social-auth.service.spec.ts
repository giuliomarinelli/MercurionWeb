import { Test, TestingModule } from '@nestjs/testing';
import { SocialAuthService } from './social-auth.service';

describe('SocialAuthService', () => {
  let service: SocialAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocialAuthService],
    }).compile();

    service = module.get<SocialAuthService>(SocialAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
