import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtKeysProvider } from './jwt-keys.provider';

describe('JwtKeysProviderService', () => {
  let service: JwtKeysProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtKeysProvider,
        { provide: ConfigService, useValue: { get: jest.fn() } }
      ],
    }).compile();

    service = module.get<JwtKeysProvider>(JwtKeysProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
