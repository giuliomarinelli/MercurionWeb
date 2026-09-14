import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from 'src/metadata/metadata'
import { ConfirmDTO } from './Models/confirm-responses.dto';
import { ResponseService } from './services/response.service';
import { ReadinessService } from './shutdown/readiness.service'
import { RedisCapabilityService } from './app_modules/redis/services/redis-capability.service'

@Controller('health')
export class HealthController {

    constructor(
        private readonly _r: ResponseService,
        private readonly readiness: ReadinessService,
        private readonly redisCapabilities: RedisCapabilityService
    ) {}

    @Get()
    @Public()
    async health(): Promise<ConfirmDTO> {
        if (!this.readiness.isReady) {
            throw new ServiceUnavailableException('Not ready')
        }
        try {
            await this.redisCapabilities.assertRequiredCapabilities()
        } catch (error) {
            if (error instanceof Error) {
                throw new ServiceUnavailableException(error.message)
            }
            throw new ServiceUnavailableException('Redis required capabilities unavailable')
        }
        return this._r.ok('Health OK')
    }

}
