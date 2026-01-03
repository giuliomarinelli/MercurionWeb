import { Controller, Get } from '@nestjs/common';
import { ConfirmDTO } from './Models/confirm-responses.dto';
import { ResponseService } from './services/response.service';
import { Public } from './metadata/metadata';

@Controller('test')
export class TestController {

    constructor(private readonly _r: ResponseService) { }

    @Get()
    test(): ConfirmDTO {
        return this._r.ok('TEST DEL BACKEND OK')
    }

    @Get()
    @Public()
    health(): ConfirmDTO {
        return this._r.ok('Health OK')
    }

}
