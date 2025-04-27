import { RecordAny } from './../../../../node_modules/meilisearch/dist/types/types/types.d';
import { MoleculePreviewDBView } from './../../chembl/Models/entities/molecule-preview-db-view.entity';
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Index, MeiliSearch } from 'meilisearch';

@Injectable()
export class MoleculeSyncService {
    
    private index: Index<RecordAny>

    constructor(
        @InjectRepository(MoleculePreviewDBView)
        private readonly moleculeRepo: Repository<MoleculePreviewDBView>,

        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch,
    ) {
        this.index = this.meiliClient.index('molecules')
    }

    async syncAllMoleculesWithProgress(onProgress: (progress: { synced: number; total: number }) => void, batchSize = 5000) {
        const total = await this.moleculeRepo.count()
        let offset = 0
        let synced = 0

        while (synced < total) {
            const batch = await this.moleculeRepo.find({
                skip: offset,
                take: batchSize,
            });

            if (batch.length === 0) break;

            await this.index.addDocuments(batch);

            synced += batch.length
            offset += batchSize

            // Notifica il progresso
            onProgress({ synced, total })
        }
    }


    async createIndexIfNotExists() {
        const indexes = await this.meiliClient.getIndexes();
        const exists = indexes.results.find(idx => idx.uid === 'molecules')

        if (!exists) {
            console.log('🔵 Creating molecules index...')
            await this.meiliClient.createIndex('molecules', {
                primaryKey: 'id',
            });

            // Set searchable and filterable attributes if you want
            await this.index.updateSettings({
                searchableAttributes: ['preferredName', 'synonyms', 'cmbId, smiles'],
                filterableAttributes: ['maxPhase', 'mwFreebase', 'alogp', 'moleculeType', 'oralAdmin', 'parenteralAdmin', 'topicalAdmin'],
            });

            console.log('🔵 Index molecules created and configured.')
        } else {
            console.log('🔵 Index molecules already exists.')
        }
    }
}
