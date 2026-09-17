// embedding/embedding.controller.ts
import { Controller, Get, Query, ParseIntPipe, ParseBoolPipe, DefaultValuePipe } from '@nestjs/common';
import { EmbeddingService } from '../services/embedding.service';
import { Public } from 'src/metadata/metadata';
import type { EmbeddingResponse } from '@mercurion/rest-contracts'

@Controller('embedding')
export class EmbeddingController {
    constructor(private readonly svc: EmbeddingService) { }

    @Public()
    @Get('/get-similar-molregnos')
    async getSimilarMolregnos(
        @Query('molregno', ParseIntPipe) molregno: number,
        @Query('n', new DefaultValuePipe(10), ParseIntPipe) n: number,
        @Query('only_molregnos', new DefaultValuePipe(true), ParseBoolPipe) onlyMolregnos: boolean,
        @Query('with_no_name', new DefaultValuePipe(false), ParseBoolPipe) withNoName: boolean
    ): Promise<EmbeddingResponse> {
        const result = await this.svc.getSimilarMolregnos(
            molregno,
            n,
            withNoName ? 'true' : 'false',
        )

        return onlyMolregnos ? result.map(r => r.molregno) : result
    }
}
