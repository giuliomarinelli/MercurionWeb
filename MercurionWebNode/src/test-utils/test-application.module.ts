import { DynamicModule, Module } from '@nestjs/common';
import { ResponseModule } from '../services/response.module';
import { TestController } from '../test.controller';
import { AppModule } from '../app.module';
import {
  createConfigurationModule,
  type ConfigurationModuleOptions,
} from '../config/configuration.module';

@Module({
  imports: [AppModule, ResponseModule],
  controllers: [TestController],
})
export class TestApplicationModule {}

export interface TestApplicationModuleOptions {
  readonly configuration?: ConfigurationModuleOptions;
}

export function createTestApplicationModule(
  options: TestApplicationModuleOptions = {},
): DynamicModule {
  return {
    module: TestApplicationModule,
    imports: [
      createConfigurationModule(options.configuration),
      AppModule,
      ResponseModule,
    ],
  };
}
