// embedding/embedding.controller.ts
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { EmbeddingService } from '../services/embedding.service';
import { Public } from 'src/metadata/metadata';
import type { EmbeddingResponse } from '@mercurion/rest-contracts'

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
    ): Promise<EmbeddingResponse> {
        const parsedMolregno = Number(molregno)
        if (!Number.isFinite(parsedMolregno)) {
            throw new BadRequestException('molregno must be a number')
        }

        const parsedN = Number(n ?? 10)
        if (!Number.isFinite(parsedN) || parsedN <= 0) {
            throw new BadRequestException('n must be a positive number')
        }

        const onlyMolregnosFlag = String(only_molregnos ?? 'true').trim().toLowerCase()
        const withNoNameFlag = String(with_no_name ?? 'false').trim().toLowerCase()
        if (!['true', 'false'].includes(onlyMolregnosFlag) || !['true', 'false'].includes(withNoNameFlag)) {
            throw new BadRequestException('Boolean query params must be either true or false')
        }

        const onlyMolregnos = onlyMolregnosFlag === 'true'
        const withNoNameParam = withNoNameFlag === 'true' ? 'true' : 'false'
        const result = await this.svc.getSimilarMolregnos(parsedMolregno, parsedN, withNoNameParam);

        return onlyMolregnos ? result.map(r => r.molregno) : result
    }
}
