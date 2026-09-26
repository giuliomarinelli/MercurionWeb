import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from './security.service';
import { ConfigService } from '@nestjs/config';
import { PasswordEncoderService } from './password-encoder.service';

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(async () => {
    const configMock = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'Totp':
            return {
              bytes: 32,
              digits: 6,
              period: 30,
              totpPepper: 'pepper',
            };
          case 'App.AES_secret':
            return Buffer.alloc(32).toString('base64');
          case 'App.userId_AES_encryptionSecret':
            return Buffer.alloc(40, 7).toString('base64');
          case 'App.deviceIdSignatureSecret':
            return 'device-secret';
          case 'App.globalName':
            return 'Mercurion';
          default:
            return '';
        }
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        { provide: ConfigService, useValue: configMock },
        { provide: PasswordEncoderService, useValue: {} },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('round-trips a user ID with an AES secret containing at least 32 bytes', () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    const encryptedUserId = service.encryptUserId(userId as never);

    expect(encryptedUserId).not.toBe(userId);
    expect(service.decryptUserId(encryptedUserId)).toBe(userId);
  });
});
