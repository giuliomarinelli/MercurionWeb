import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeiliSearch, Index, EnqueuedTask } from 'meilisearch';
import { MoleculePreviewDBView } from './../../chembl/Models/entities/molecule-preview-db-view.entity';
import { RecordAny } from 'meilisearch';

@Injectable()
export class MoleculeSyncService implements OnModuleInit {

    private readonly logger = new Logger(MoleculeSyncService.name)

    private index: Index<RecordAny>

    constructor(
        @InjectRepository(MoleculePreviewDBView, 'ChemblDB')
        private readonly moleculeRepo: Repository<MoleculePreviewDBView>,

        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch,
    ) { }

    async onModuleInit() {
        await this.createIndexIfNotExists()
        this.index = this.meiliClient.index('molecules') 
    }

    async syncAllMoleculesWithProgress(
        onProgress: (progress: { synced: number; total: number }) => void,
        batchSize = 5000
    ): Promise<void> {
        const total = await this.moleculeRepo.count()
        this.logger.log(`🔵 Total molecules to sync: ${total}`)

        let offset = 0
        let synced = 0

        while (synced < total) {
            const batch = await this.moleculeRepo.find({
                skip: offset,
                take: batchSize,
            })

            if (batch.length === 0) {
                this.logger.log('🛑 No more molecules to sync, exiting loop.')
                break
            }

            this.logger.log(`🟢 Syncing batch: offset=${offset}, size=${batch.length}`)

            try {
                const task: EnqueuedTask = await this.index.addDocuments(batch, { primaryKey: 'id' })
                this.logger.log(`📦 Batch enqueued → taskUid: ${task.taskUid}`)
            } catch (error) {
                this.logger.error(`❌ Failed to enqueue batch at offset ${offset}: ${error.message}`)
            }

            synced += batch.length
            offset += batchSize

            onProgress({ synced, total })
        }

        this.logger.log(`✅ Sync completed. Total synced: ${synced}`)
    }

    async createIndexIfNotExists(): Promise<void> {
        const indexes = await this.meiliClient.getIndexes()
        const exists = indexes.results.find(idx => idx.uid === 'molecules')

        if (!exists) {
            this.logger.log('🔵 Creating molecules index...')
            await this.meiliClient.createIndex('molecules', {
                primaryKey: 'id',
            });

            this.logger.log('🔧 Configuring molecules index settings...')
            await this.meiliClient.index('molecules').updateSettings({
                searchableAttributes: ['preferredName', 'synonyms', 'cmbId', 'smiles'],
                filterableAttributes: [
                    'maxPhase',
                    'mwFreebase',
                    'alogp',
                    'moleculeType',
                    'oralAdmin',
                    'parenteralAdmin',
                    'topicalAdmin',
                ],
            });

            this.logger.log('✅ Molecules index created and configured.')
        } else {
            this.logger.log('🔵 Molecules index already exists.')
        }
    }
}
