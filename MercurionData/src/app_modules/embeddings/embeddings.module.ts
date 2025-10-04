import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { MoleculeEmbedding } from './Models/entities/molecule-embedding.entity';
import { EmbeddingClientService } from './services/embedding-client.service';
import { EmbeddingSyncStreamService } from './services/embedding-sync-stream.service';
import { EmbeddingSyncController } from './controllers/embedding-sync.controller';
import { MoleculeIndexView } from '../chembl_36/Models/entities/molecule-index-mv';
import { PreferredNameSyncService } from './services/preferred-name-backfill.service';


@Module({
    imports: [
        TypeOrmModule.forFeature([
            MoleculeEmbedding
        ], 'MercurionConn'),
        TypeOrmModule.forFeature([MoleculeIndexView])
    ],
    providers: [EmbeddingClientService, EmbeddingSyncStreamService, PreferredNameSyncService],
    controllers: [EmbeddingSyncController]
})
export class EmbeddingsModule {}
