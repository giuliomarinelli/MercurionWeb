import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { MercurionAIService } from '../services/mercurion.service';
import { SmilesDTO } from '../Models/DTO/smiles.cls.dto';
import { MercurionInferDataDTO } from '../Models/DTO/mercurion-infer-res.dto';
import { Authorization } from 'src/metadata/metadata';

@Controller('mercurion')
export class MercurionAIController {

    constructor(
        private readonly mercurionService: MercurionAIService
    ) { }

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