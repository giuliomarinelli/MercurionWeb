import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm'
import { MoleculeEmbedding } from './Models/entities/molecule-embedding.entity';
import { EmbeddingService } from './services/embedding.service';
import { EmbeddingController } from './controllers/embedding.controller';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
  imports: [TypeOrmModule.forFeature([MoleculeEmbedding]), MeilisearchModule],
  providers: [EmbeddingService],
  controllers: [EmbeddingController]
})
export class EmbeddingModule {}
