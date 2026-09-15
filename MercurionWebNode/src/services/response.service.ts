import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfirmDTO } from 'src/models/confirm-responses.dto';

@Injectable()
export class ResponseService {

    public ok(message: string, statusCode: HttpStatus = HttpStatus.OK): ConfirmDTO {
        return {
            statusCode,
            timestamp: new Date().toISOString(),
            message
        }
    }

}
