import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Environment } from '../src/config/config.schema';
import { createTestConfigurationModule } from '../src/test-utils/configuration';

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
});
