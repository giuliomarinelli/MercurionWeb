import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2PersistenceService } from './o-auth2-persistence.service';

describe('OAuth2PersistenceService', () => {
  let service: OAuth2PersistenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OAuth2PersistenceService],
    }).compile();

    service = module.get<OAuth2PersistenceService>(OAuth2PersistenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
