// embedding/embedding.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { EmbeddingService, Neighbor } from '../services/embedding.service';
import { Public } from 'src/metadata/metadata';

@Controller('embedding')
export class EmbeddingController {
    constructor(private readonly svc: EmbeddingService) { }

    @Public()
    @Get('/get-similar-molregnos')
    async getSimilarMolregnos(
        @Query('molregno') molregno: number,
        @Query('n') n: number = 10,
        @Query('only_molregnos') only_molregnos: string = 'true',
        @Query('with_no_name') with_no_name: string = 'false'
    ): Promise<Neighbor[] | number[]> {
        const result = await this.svc.getSimilarMolregnos(molregno, n, with_no_name);
        if (only_molregnos === 'true') {
            return result.map(r => r.molregno)
        }
        return result
    }
}
