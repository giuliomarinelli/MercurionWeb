jest.mock('./config/env-validation', () => ({
  validateEnvOrKillProcess: jest.fn((config) => config),
}));

import { AppModule } from './app.module';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { SocketIoModule } from './app_modules/socket.io/socket.io.module';

describe('AppModule', () => {
  it('should be defined', () => {
    expect(new AppModule()).toBeDefined();
  });

  it('registers SocketIoModule exactly once at the composition root', () => {
    const imports =
      (Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[] | undefined) ?? [];

    expect(imports.filter((moduleType) => moduleType === SocketIoModule)).toHaveLength(1);
  });
});
