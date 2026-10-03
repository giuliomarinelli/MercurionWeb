import { Body, Controller, HttpCode, HttpStatus, Post, ValidationPipe } from '@nestjs/common';
import { MercurionAIService } from '../services/mercurion-ai.service';
import { SmilesDTO } from '../models/dto/smiles.cls.dto';
import { MercurionInferDataDTO } from '../models/dto/mt21/mercurion-infer-res.dto';
import { Public } from 'src/metadata/metadata';

@Controller('mercurion-ai')
export class MercurionAIController {

    constructor(
        private readonly mercurionService: MercurionAIService
    ) { }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/tox-21/infer')
    public async inferTox21Top4Smiles(
        @Body(new ValidationPipe({ transform: true })) smilesDTO: SmilesDTO        
    ): Promise<MercurionInferDataDTO> {
        const { smiles } = smilesDTO
        return await this.mercurionService.getInferenceFromTop4MercurionTox21({
            smiles,
            accessToken: ''
        })
    }

}