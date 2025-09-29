import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { MoleculeEmbedding } from './Models/entities/molecule-embedding.entity';
import { EmbeddingClientService } from './services/embedding-client.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MoleculeEmbedding
        ], 'MercurionConn')
    ],
    providers: [EmbeddingClientService]
})
export class EmbeddingsModule {}
