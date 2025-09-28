import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Index, EnqueuedTask, RecordAny, MeiliSearch } from 'meilisearch';
import { MoleculePreviewView } from 'src/app_modules/chembl_36/Models/entities/molecule-preview-view';

@Injectable()
export class MoleculePreviewSyncService {
    private readonly logger = new Logger(MoleculePreviewSyncService.name);
    private index: Index<RecordAny>;

    constructor(
        @InjectRepository(MoleculePreviewView)
        private readonly moleculeRepo: Repository<MoleculePreviewView>,
        private readonly meiliClient: MeiliSearch
    ) { }

    async onModuleInit() {
        await this.createIndexIfNotExists();
        this.index = this.meiliClient.index('molecule_previews_chembl_36');
    }

    syncAllMoleculesAsObservable(offset = 0, batchSize = 15000): Observable<{ synced: number; total: number }> {

        const subject = new Subject<{ synced: number; total: number }>();

        (async () => {
            const total = await this.moleculeRepo.count();
            this.logger.log(`🔵 Total molecules to sync: ${total}`);
            let synced = 0;

            while (synced < total) {
                const batch = await this.moleculeRepo.find({ skip: offset, take: batchSize });
                if (batch.length === 0) break;

                try {
                    const task: EnqueuedTask = await this.index.addDocuments(batch, { primaryKey: 'id' });
                    this.logger.log(`📦 Enqueued taskUid=${task.taskUid} (${synced}/${total})`);
                } catch (e) {
                    this.logger.error(`❌ Enqueue failed at offset ${offset}: ${e?.message}`);
                }

                synced += batch.length;
                offset += batchSize;
                subject.next({ synced, total });
            }

            subject.complete();
            this.logger.log(`✅ Sync completed. Total synced: ${synced}`);
        })().catch(err => {
            subject.error(err);
        });

        return subject.asObservable();
    }

    private async createIndexIfNotExists() {
        const uid = 'molecule_previews_chembl_36';
        const indexes = await this.meiliClient.getIndexes();
        const exists = indexes.results.some(i => i.uid === uid);

        if (!exists) {
            await this.meiliClient.createIndex(uid, { primaryKey: 'id' });
            await this.meiliClient.index(uid).updateSettings({
                searchableAttributes: ['preferredName', 'synonyms', 'cmbId', 'smiles'],
                filterableAttributes: [
                    'maxPhase', 'mwFreebase', 'alogp', 'moleculeType',
                    'oralAdmin', 'parenteralAdmin', 'topicalAdmin'
                ],
            });
        }
    }
}
