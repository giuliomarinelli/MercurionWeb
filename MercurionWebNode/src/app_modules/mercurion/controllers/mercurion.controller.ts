import { FastifyRequest } from 'fastify';
import { Body, Controller, Post, Req, ValidationPipe } from '@nestjs/common';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { MercurionService } from '../services/mercurion.service';
import { SmilesDTO } from '../Models/DTO/smiles.cls.dto';
import { MercurionInferDataDTO } from '../Models/DTO/mercurion-infer-res.dto';

@Controller('mercurion')
export class MercurionController {

    constructor(
        private readonly jwtTools: JwtToolsService,
        private readonly mercurionService: MercurionService
    ) { }

    @Post('/infer')
    public async inferSmiles(
        @Body(new ValidationPipe({ transform: true })) smilesDTO: SmilesDTO,
        @Req() req: FastifyRequest
    ): Promise<MercurionInferDataDTO> {
        const { smiles } = smilesDTO
        const accessToken = this.jwtTools.extractAccessTokenFromReq(req)
        return await this.mercurionService.getInferenceFromMercurion({
            smiles,
            accessToken
        })
    }

}