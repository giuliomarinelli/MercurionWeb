import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Environment } from '../src/config/config.schema';
import { createTestConfigurationModule } from '../src/test-utils/configuration';
import { AppModule } from '../src/app.module';
import { TestApplicationModule } from '../src/test-utils/test-application.module';
import { TestController } from '../src/test.controller';

describe('application configuration (e2e)', () => {
  it('loads isolated test configuration without production secrets', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [createTestConfigurationModule()]
    }).compile();

    const config = moduleRef.get(ConfigService);
    expect(config.get('App.env')).toBe(Environment.Test);
    expect(config.get('App.port')).toBe(1);

    await moduleRef.close();
  });

  it('does not register /api/test in the production application graph', () => {
    const productionControllers =
      (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule) as unknown[] | undefined) ?? [];

    expect(productionControllers).not.toContain(TestController);
  });

  it('registers /api/test only in the explicit test application graph', () => {
    const testControllers =
      (Reflect.getMetadata(
        MODULE_METADATA.CONTROLLERS,
        TestApplicationModule,
      ) as unknown[] | undefined) ?? [];

    expect(testControllers).toContain(TestController);
  });
});
