// embedding/embedding.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { GetSimilarMolregnosDto } from '../DTO/get-similar-molregnos.dto';
import { EmbeddingService, Neighbor } from '../services/embedding.service';
import { Public } from 'src/metadata/metadata';

@Controller('embedding')
export class EmbeddingController {
    constructor(private readonly svc: EmbeddingService) { }

    @Public()
    @Get('/get-similar-molregnos')
    async getSimilarMolregnos(@Query() dto: GetSimilarMolregnosDto): Promise<Neighbor[] | number[]> {
        const result = await this.svc.getSimilarMolregnos(dto);
        if (dto.only_molregnos) {
            return result.map(r => r.molregno)
        }
        return result
    }
}
