import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfirmDTO } from 'src/Models/confirm-responses.dto';

@Injectable()
export class ResponseService {

    public ok(message: string): ConfirmDTO {
        return {
            statusCode: HttpStatus.OK,
            timestamp: new Date().toISOString(),
            message
        }
    }

}
