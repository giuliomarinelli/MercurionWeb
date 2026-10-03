import { Controller, HttpCode, HttpStatus, Post, Body, ValidationPipe } from '@nestjs/common';
import { PcpService } from '../services/pcp.service';
import { Public } from 'src/metadata/metadata';
import { PcpGetIupacNameFromSmilesDTO } from '../models/dto/pcp-get-iupac-name-from-smiles.dto';


@Controller('pcp-api')
export class PcpController {

    constructor(private readonly pcpService: PcpService) { }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('get-iupac-name-from-smiles')
    async getIupacName(
        @Body(new ValidationPipe({ transform: true })) dto: PcpGetIupacNameFromSmilesDTO
    ): Promise<string> {
        return this.pcpService.getIupacNameFromSmiles(dto)
    }

}
