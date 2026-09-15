import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfirmDTO } from 'src/models/confirm-responses.dto';
import { utcNow } from 'src/utils/temporal/temporal'

@Injectable()
export class ResponseService {

    public ok(message: string, statusCode: HttpStatus = HttpStatus.OK): ConfirmDTO {
        return {
            statusCode,
            timestamp: utcNow(),
            message
        }
    }

}
