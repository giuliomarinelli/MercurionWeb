import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtKeysProvider } from './jwt-keys.provider';
import { Environment } from 'src/config/config.schema';
import { TokenType } from '../models/enums/token-type.enum';
import { jwtKeyAlgorithms } from '../keys/jwt-key-manifest';
import { JwtKeyManifestValidationError } from '../keys/jwt-key-manifest.parser';

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

  it('validates metadata using the configured environment without provisioning material', () => {
    getOrThrow.mockReturnValue(Environment.Test);
    const input = {
      schemaVersion: 1, environment: Environment.Test, revision: 1, previousRevision: null,
      updatedAt: '2026-10-25T00:00:00.000Z',
      lastOperation: { kind: 'initialize', operator: 'synthetic-operator', reason: 'Provisioning pending' },
      domains: Object.values(TokenType).map(purpose => ({
        purpose, algorithm: jwtKeyAlgorithms[purpose], issuance: 'suspended', activeKid: null, keys: []
      }))
    };
    const result = service.validateManifest(input);
    expect(result.environment).toBe(Environment.Test);
    expect(Object.isFrozen(result)).toBe(true);
    expect(getOrThrow).toHaveBeenCalledWith('App.env');
    input.environment = Environment.Production;
    expect(() => service.validateManifest(input)).toThrow(JwtKeyManifestValidationError);
  });

  it('cannot validate a manifest when the trusted environment is unavailable', () => {
    getOrThrow.mockImplementation(() => { throw new Error('Missing trusted environment'); });
    expect(() => service.validateManifest({})).toThrow('Missing trusted environment');
  });
});
