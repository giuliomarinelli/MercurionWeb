import { Module } from '@nestjs/common';
import { MoleculePreviewSyncService } from './services/molecule-preview-sync.service';
import { Meilisearch } from 'meilisearch';
import { Chembl36ToMeilisearchSyncController } from './controllers/chembl_36_to_meilisearch_sync.controller';
import { Chembl36Module } from '../chembl_36/chembl_36.module';
import { MoleculeDetailSyncService } from './services/molecule-detail-sync.service';
import { MeiliPreferredNameItSyncService } from './services/meili-preferred-name-it-sync.service';
import { MeiliPreferredNameItSyncController } from './controllers/meili-preferred-name-it-sync.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculeNameI18n } from '../translation/Models/entities/molecule-name-i18n.entity';

@Module({
  imports: [
    Chembl36Module,
    TypeOrmModule.forFeature([MoleculeNameI18n], 'MercurionConn')
  ],
  providers: [
    {
      provide: 'MEILISEARCH_CLIENT',
      useFactory: () => new Meilisearch({
                host: 'http://localhost:7700',
                apiKey: 'root'
            }),
    },
    MoleculePreviewSyncService,
    MoleculeDetailSyncService,
    MeiliPreferredNameItSyncService
  ],
  controllers: [Chembl36ToMeilisearchSyncController, MeiliPreferredNameItSyncController]
})
export class MeilisearchModule { }
