import { Controller, Get } from '@nestjs/common';
import { Public } from './metadata/metadata';
import { ConfirmDTO } from './Models/confirm-responses.dto';
import { ResponseService } from './services/response.service';

@Controller('test')
export class TestController {

    constructor(private readonly _r: ResponseService) { }

    @Public()
    @Get()
    test(): ConfirmDTO {
        return this._r.ok('TEST DEL BACKEND OK')
    }

}
