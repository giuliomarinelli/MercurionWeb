import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm'
import { MoleculeEmbedding } from './Models/entities/molecule-embedding.entity';
import { EmbeddingService } from './services/embedding.service';
import { EmbeddingController } from './controllers/embedding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MoleculeEmbedding])],
  providers: [EmbeddingService],
  controllers: [EmbeddingController]
})
export class EmbeddingModule {}
