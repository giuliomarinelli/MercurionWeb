import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2PersistenceService } from './o-auth2-persistence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OAuth2TokenEntity } from '../Models/entities/oauth2-token.entity';

describe('OAuth2PersistenceService', () => {
  let service: OAuth2PersistenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2PersistenceService,
        {
          provide: getRepositoryToken(OAuth2TokenEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OAuth2PersistenceService>(OAuth2PersistenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
