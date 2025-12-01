import { Test, TestingModule } from '@nestjs/testing';
import { SercurityService } from './sercurity.service';
import { ConfigService } from '@nestjs/config';
import { PasswordEncoderService } from './password-encoder.service';

describe('SercurityService', () => {
  let service: SercurityService;

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
        SercurityService,
        { provide: ConfigService, useValue: configMock },
        { provide: PasswordEncoderService, useValue: {} },
      ],
    }).compile();

    service = module.get<SercurityService>(SercurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
