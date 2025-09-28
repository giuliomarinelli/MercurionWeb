/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Index, EnqueuedTask, RecordAny, MeiliSearch } from 'meilisearch';
import { MoleculePreviewView } from 'src/app_modules/chembl_36/Models/entities/molecule-preview-view';

type TaskStatus = 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';

@Injectable()
export class MoleculePreviewSyncService {
    private readonly logger = new Logger(MoleculePreviewSyncService.name);
    private index: Index<RecordAny>;

    constructor(
        @InjectRepository(MoleculePreviewView)
        private readonly moleculeRepo: Repository<MoleculePreviewView>,
        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch
    ) { }

    async onModuleInit() {
        await this.createIndexIfNotExists();
        this.index = this.meiliClient.index('molecule_previews_chembl_36');
    }

    /** Helper portabile: attende il completamento del task senza usare client.waitForTask */
    private async waitForTaskPortable(taskUid: number, timeoutMs = 10 * 60_000, intervalMs = 500) {
        const c: any = this.meiliClient;
        const i: any = this.index;
        const start = Date.now();

        const canGetFromClient = typeof c?.getTask === 'function';
        const canGetFromIndex = typeof i?.getTask === 'function';
        const canGetFromNS = typeof c?.tasks?.getTask === 'function';

        if (!canGetFromClient && !canGetFromIndex && !canGetFromNS) {
            throw new Error('Nessuna API task disponibile (né client.getTask, né index.getTask, né client.tasks.getTask).');
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const t = canGetFromClient
                ? await c.getTask(taskUid)
                : (canGetFromNS ? await c.tasks.getTask(taskUid) : await i.getTask(taskUid));

            const status: TaskStatus = t.status;
            if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
                return t;
            }
            if (Date.now() - start > timeoutMs) {
                throw new Error(`Timeout in attesa del task ${taskUid} (ultimo status=${status})`);
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
    }

    /** Stream di avanzamento per SSE/NDJSON, con keyset pagination. */
    syncAllMoleculesAsObservable(
        startId = 0,
        batchSize = 10_000
    ): Observable<{ synced: number; total: number; lastId: number }> {
        const subject = new Subject<{ synced: number; total: number; lastId: number }>();

        (async () => {
            const total = await this.moleculeRepo.count();
            this.logger.log(`🔵 Total molecules to sync: ${total}`);

            let synced = 0;
            let lastId = startId;

            while (true) {
                const batch = await this.moleculeRepo.find({
                    where: { id: MoreThan(lastId) },
                    order: { id: 'ASC' },
                    take: batchSize,
                });
                if (batch.length === 0) break;

                try {
                    const task: EnqueuedTask = await this.index.addDocuments(batch, { primaryKey: 'id' });

                    // Attendi esito senza usare .waitForTask
                    const res = await this.waitForTaskPortable(task.taskUid);
                    if (res.status !== 'succeeded') {
                        this.logger.error(`❌ Task ${task.taskUid} failed: ${JSON.stringify(res)}`);
                    } else {
                        this.logger.log(`📦 Task ${task.taskUid} OK — batch=${batch.length}`);
                    }
                } catch (e: any) {
                    this.logger.error(`❌ Enqueue/wait failed at lastId=${lastId}: ${e?.message || e}`);
                    // opzionale: break/throw per fermare il job
                }

                synced += batch.length;
                lastId = batch[batch.length - 1].id;
                subject.next({ synced, total, lastId });
            }

            this.logger.log(`✅ Sync completed. Total synced: ${synced}`);
            subject.complete();
        })().catch(err => subject.error(err));

        return subject.asObservable();
    }

    private async createIndexIfNotExists() {
        const uid = 'molecule_previews_chembl_36';
        const indexes = await this.meiliClient.getIndexes();
        const exists = indexes.results.some(i => i.uid === uid);

        if (!exists) {
            this.logger.log(`🔵 Creating index ${uid}...`);
            await this.meiliClient.createIndex(uid, { primaryKey: 'id' });
            await this.meiliClient.index(uid).updateSettings({
                searchableAttributes: ['preferredName', 'synonyms', 'cmbId', 'smiles'],
                filterableAttributes: [
                    'maxPhase', 'mwFreebase', 'alogp', 'moleculeType',
                    'oralAdmin', 'parenteralAdmin', 'topicalAdmin',
                    'blackBoxWarningFlag', 'naturalProductFlag', 'prodrugFlag',
                ],
            });
            this.logger.log(`✅ Index ${uid} created & configured.`);
        } else {
            this.logger.log(`🔵 Index ${uid} already exists.`);
        }
    }
}
