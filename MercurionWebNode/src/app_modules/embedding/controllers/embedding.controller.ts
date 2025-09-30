// embedding/embedding.controller.ts
import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { EmbeddingService } from '../services/embedding.service';
import { GetSimilarMolregnosDto } from '../DTO/get-similar-molregnos.dto';
import { Public } from 'src/metadata/metadata';



@Controller('embedding')
export class EmbeddingController {
    constructor(private readonly embeddingService: EmbeddingService) { }

    @Public()
    @Get('get-similar-molregnos')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async getSimilarMolregnos(
        @Query() query: GetSimilarMolregnosDto,
    ): Promise<number[]> {
        return this.embeddingService.getSimilarMolregnos(query);
    }
}
