import { Body, Controller, HttpCode, HttpStatus, Post, ValidationPipe } from '@nestjs/common';
import { MercurionAIService } from '../services/mercurion-ai.service';
import { SmilesDTO } from '../Models/DTO/smiles.cls.dto';
import { MercurionInferDataDTO } from '../Models/DTO/mt21/mercurion-infer-res.dto';
import { Authorization } from 'src/metadata/metadata';

@Controller('mercurion-ai')
export class MercurionAIController {

    constructor(
        private readonly mercurionService: MercurionAIService
    ) { }

    @HttpCode(HttpStatus.OK)
    @Post('/tox-21/infer')
    public async inferTox21Top4Smiles(
        @Body(new ValidationPipe({ transform: true })) smilesDTO: SmilesDTO,
        @Authorization() accessToken: string
    ): Promise<MercurionInferDataDTO> {
        const { smiles } = smilesDTO
        return await this.mercurionService.getInferenceFromTop4MercurionTox21({
            smiles,
            accessToken
        })
    }

}