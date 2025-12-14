// embedding/embedding.controller.ts
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
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
        const parsedMolregno = Number(molregno)
        if (!Number.isFinite(parsedMolregno)) {
            throw new BadRequestException('molregno must be a number')
        }
        const parsedN = Number(n ?? 10)
        if (!Number.isFinite(parsedN) || parsedN <= 0) {
            throw new BadRequestException('n must be a positive number')
        }
        const onlyMolregnosFlag = typeof only_molregnos === 'string' ? only_molregnos.trim().toLowerCase() : `${only_molregnos}`
        const withNoNameFlag = typeof with_no_name === 'string' ? with_no_name.trim().toLowerCase() : `${with_no_name}`
        const onlyMolregnos = onlyMolregnosFlag === 'true'
        const withNoName = withNoNameFlag === 'true'
        if (!['true', 'false'].includes(onlyMolregnosFlag) || !['true', 'false'].includes(withNoNameFlag)) {
            throw new BadRequestException('Boolean query params must be either true or false')
        }
        const result = await this.svc.getSimilarMolregnos(parsedMolregno, parsedN, withNoName);
        if (onlyMolregnos) {
            return result.map(r => r.molregno)
        }
        return result
    }
}
