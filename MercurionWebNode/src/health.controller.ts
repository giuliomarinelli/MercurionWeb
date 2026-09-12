import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from 'src/metadata/metadata'
import { ConfirmDTO } from './Models/confirm-responses.dto';
import { ResponseService } from './services/response.service';
import { ReadinessService } from './shutdown/readiness.service'

@Controller('health')
export class HealthController {

    constructor(
        private readonly _r: ResponseService,
        private readonly readiness: ReadinessService
    ) {}

    @Get()
    @Public()
    health(): ConfirmDTO {
        if (!this.readiness.isReady) {
            throw new ServiceUnavailableException('Not ready')
        }
        return this._r.ok('Health OK')
    }

}
