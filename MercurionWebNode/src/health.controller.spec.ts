import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { ResponseService } from './services/response.service';
import { ReadinessService } from './shutdown/readiness.service'
import { RedisCapabilityService } from './app_modules/redis/services/redis-capability.service'

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        ResponseService,
        ReadinessService,
        { provide: RedisCapabilityService, useValue: { assertRequiredCapabilities: jest.fn() } }
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
