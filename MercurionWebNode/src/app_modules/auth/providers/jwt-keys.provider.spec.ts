import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtKeysProvider } from './jwt-keys.provider';

describe('JwtKeysProviderService', () => {
  let service: JwtKeysProvider;
  let getOrThrow: jest.Mock;

  beforeEach(async () => {
    getOrThrow = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtKeysProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow
          }
        }
      ],
    }).compile();

    service = module.get<JwtKeysProvider>(JwtKeysProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not default a missing validated environment to development keys', () => {
    getOrThrow.mockImplementation(() => {
      throw new Error('Missing configuration key "App.env"');
    });

    expect(() => service.getAccessKeyPair()).toThrow(
      'Missing configuration key "App.env"'
    );
  });
});
