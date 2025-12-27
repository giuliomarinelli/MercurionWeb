import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Environment } from 'src/config/config';
import { ReleaseService } from './release.service';

describe('ReleaseService', () => {
  let service: ReleaseService;

  beforeEach(async () => {
    const dataSourceMock = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOneOrFail: jest.fn().mockResolvedValue({
          versionString: '1.0.0',
          versionSha256: 'hash',
        }),
      }),
    };

    const configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'App.env') {
          return Environment.Test;
        }

        if (key === 'App.version') {
          return '1.0.0';
        }

        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<ReleaseService>(ReleaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
