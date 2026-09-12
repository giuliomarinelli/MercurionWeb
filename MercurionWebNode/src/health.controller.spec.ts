import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { ResponseService } from './services/response.service';
import { ReadinessService } from './shutdown/readiness.service'
import { RedisCapabilityService } from './app_modules/redis/services/redis-capability.service'

describe('HealthController', () => {
  let controller: HealthController;
  let readiness: ReadinessService;
  let redis: { assertRequiredCapabilities: jest.Mock };

  beforeEach(async () => {
    redis = { assertRequiredCapabilities: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        ResponseService,
        ReadinessService,
        { provide: RedisCapabilityService, useValue: redis }
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    readiness = module.get<ReadinessService>(ReadinessService);
  });

  it('returns the public health response when the application is ready', async () => {
    await expect(controller.health()).resolves.toMatchObject({ message: 'Health OK', statusCode: 200 });
    expect(redis.assertRequiredCapabilities).toHaveBeenCalled();
  });

  it('rejects health checks while the application is not ready', async () => {
    readiness.markDraining();

    await expect(controller.health()).rejects.toMatchObject({ status: 503 });
    expect(redis.assertRequiredCapabilities).not.toHaveBeenCalled();
  });

  it('maps capability failures to service-unavailable responses', async () => {
    redis.assertRequiredCapabilities.mockRejectedValue(new Error('redis unavailable'));

    await expect(controller.health()).rejects.toMatchObject({ status: 503, message: 'redis unavailable' });
  });
});
