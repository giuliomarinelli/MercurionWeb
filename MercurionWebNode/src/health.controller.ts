import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/metadata/metadata'
import { ConfirmDTO } from './Models/confirm-responses.dto';
import { ResponseService } from './services/response.service';

@Controller('health')
export class HealthController {

    constructor(private readonly _r: ResponseService) {}

    @Get()
    @Public()
    health(): ConfirmDTO {
        return this._r.ok('Health OK')
    }

}
