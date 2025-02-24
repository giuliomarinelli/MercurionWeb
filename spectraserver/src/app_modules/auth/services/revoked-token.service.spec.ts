import { Test, TestingModule } from '@nestjs/testing';
import { RevokedTokenService } from './revoked-token.service';

describe('RevokedTokenService', () => {
  let service: RevokedTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevokedTokenService],
    }).compile();

    service = module.get<RevokedTokenService>(RevokedTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
