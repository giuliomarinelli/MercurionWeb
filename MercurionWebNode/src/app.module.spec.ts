import { AppModule, createApplicationModule } from './app.module';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SocketIoModule } from './app_modules/socket.io/socket.io.module';
import { ConfigurationError } from './config/env-validation';
import { createConfigurationModule } from './config/configuration.module';
import {
  buildTestEnvironment,
  createTestConfigurationModule
} from './test-utils/configuration';

describe('AppModule', () => {
  it('should be defined', () => {
    expect(new AppModule()).toBeDefined();
  });

  it('registers SocketIoModule exactly once at the composition root', () => {
    const imports =
      (Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[] | undefined) ?? [];

    expect(imports.filter((moduleType) => moduleType === SocketIoModule)).toHaveLength(1);
  });

  it('assembles the production module only at the explicit bootstrap boundary', () => {
    const rootModule = createApplicationModule({
      configuration: { environment: buildTestEnvironment() }
    });

    expect(rootModule.imports).toContain(AppModule);
  });

  it('compiles isolated test configuration without developer env files', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [createTestConfigurationModule({ APP_PORT: '4321' })]
    }).compile();

    expect(moduleRef.get(ConfigService).get('App.port')).toBe(4321);
    await moduleRef.close();
  });

  it('rejects invalid bootstrap configuration without terminating Jest', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`unexpected process.exit(${String(code)})`);
    });

    await expect(
      createConfigurationModule({ environment: {} })
    ).rejects.toBeInstanceOf(ConfigurationError);
    expect(exit).not.toHaveBeenCalled();

    exit.mockRestore();
  });
});
