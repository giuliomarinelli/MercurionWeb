import { Controller, Get } from '@nestjs/common';
import { ConfirmDTO } from './Models/confirm-responses.dto';
import { ResponseService } from './services/response.service';

@Controller('test')
export class TestController {

    constructor(private readonly _r: ResponseService) { }

    @Get()
    test(): ConfirmDTO {
        return this._r.ok('TEST DEL BACKEND OK')
    }

}
