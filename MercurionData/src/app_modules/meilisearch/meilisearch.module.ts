import { Module } from '@nestjs/common';
import { MoleculePreviewSyncService } from './services/molecule-preview-sync.service';
import { Meilisearch } from 'meilisearch';
import { Chembl36ToMeilisearchSyncController } from './controllers/chembl_36_to_meilisearch_sync/chembl_36_to_meilisearch_sync.controller';
import { Chembl36Module } from '../chembl_36/chembl_36.module';

@Module({
  imports: [
    Chembl36Module
  ],
  providers: [
    {
      provide: 'MEILISEARCH_CLIENT',
      useFactory: () => new Meilisearch({
                host: 'http://localhost:7700',
                apiKey: 'root'
            }),
    },
    MoleculePreviewSyncService
  ],
  controllers: [Chembl36ToMeilisearchSyncController]
})
export class MeilisearchModule { }
