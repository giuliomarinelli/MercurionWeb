// src/app_modules/chembl_36/services/molecule-details-sync.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Index, EnqueuedTask, RecordAny, MeiliSearch } from 'meilisearch';
import { readCheckpoint, writeCheckpoint, resetCheckpoint, isUuid, ZERO_UUID } from '../utils/sync-checkpoint.util';
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv';
import { MoleculeDoc } from 'src/app_modules/chembl_36/Models/DTO/molecule-detail.dtos';

type TaskStatus = 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';

@Injectable()
export class MoleculeDetailSyncService {
    
    private readonly logger = new Logger(MoleculeDetailSyncService.name);
    private index: Index<RecordAny>;
    private readonly indexUid = 'molecule_details_chembl_36';

    constructor(
        @InjectRepository(MoleculeIndexView)
        private readonly moleculeRepo: Repository<MoleculeIndexView>,
        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch
    ) { }

    async onModuleInit() {
        await this.createIndexIfNotExists();
        this.index = this.meiliClient.index(this.indexUid);
    }

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

        while (true) {
            const t = canGetFromClient
                ? await c.getTask(taskUid)
                : (canGetFromNS ? await c.tasks.getTask(taskUid) : await i.getTask(taskUid));
            const status: TaskStatus = t.status;
            if (status === 'succeeded' || status === 'failed' || status === 'canceled') return t;
            if (Date.now() - start > timeoutMs) throw new Error(`Timeout in attesa del task ${taskUid} (status=${status})`);
            await new Promise(r => setTimeout(r, intervalMs));
        }
    }

    /**
     * Stream di sync con keyset pagination su stableUuid.
     * Se restart=false (default), si riprende dal checkpoint salvato su disco.
     */
    syncAllAsObservable(
        batchSize = 2_500,
        restart = false
    ): Observable<{ synced: number; total: number; lastKey: string }> {
        const subject = new Subject<{ synced: number; total: number; lastKey: string }>();

        (async () => {
            // 1) Determina il punto di partenza
            let lastKey: string;
            if (!restart) {
                const ck = await readCheckpoint();
                if (ck?.lastKey && isUuid(ck.lastKey)) {
                    lastKey = ck.lastKey;
                    this.logger.log(`🟡 Ripartenza da checkpoint: ${lastKey}`);
                } else {
                    const first = await this.moleculeRepo.findOne({
                        order: { stableUuid: 'ASC' },
                        select: ['stableUuid'],
                    });
                    lastKey = first ? first.stableUuid : ZERO_UUID;
                    this.logger.log(`🟡 Nessun checkpoint: parto dal primo UUID deterministico = ${lastKey}`);
                }
            } else {
                await resetCheckpoint();
                const first = await this.moleculeRepo.findOne({
                    order: { stableUuid: 'ASC' },
                    select: ['stableUuid'],
                });
                lastKey = first ? first.stableUuid : ZERO_UUID;
                this.logger.log(`🧹 Restart: checkpoint azzerato, parto da ${lastKey}`);
            }


            const total = await this.moleculeRepo.count();
            this.logger.log(`🔵 Total molecules to sync: ${total}`);

            // 2) Loop a batch
            let synced = 0;
            while (true) {
                const batch = await this.moleculeRepo.find({
                    where: { stableUuid: MoreThan(lastKey) },
                    order: { stableUuid: 'ASC' },
                    take: batchSize,
                });
                if (batch.length === 0) break;

                // 3) Prepara i documenti piatti per Meili
                const docs = batch.map(row => {
                    const d: MoleculeDoc = (row as any).doc;
                    return {
                        stableUuid: row.stableUuid, // primaryKey in Meili
                        molregno: d.id,             // utile per filtri/joins
                        ...d,
                    };
                });

                // 4) Indicizza e aspetta esito task
                try {
                    const task: EnqueuedTask = await this.index.addDocuments(docs, { primaryKey: 'stableUuid' });
                    const res = await this.waitForTaskPortable(task.taskUid);
                    if (res.status !== 'succeeded') {
                        this.logger.error(`❌ Task ${task.taskUid} failed: ${JSON.stringify(res)}`);
                    } else {
                        this.logger.log(`📦 Task ${task.taskUid} OK — batch=${batch.length}`);
                        // ✅ 5) Persisti checkpoint SOLO dopo esito ok
                        lastKey = batch[batch.length - 1].stableUuid;
                        await writeCheckpoint({ lastKey, updatedAt: new Date().toISOString() });
                    }
                } catch (e: any) {
                    this.logger.error(`❌ Enqueue/wait failed at lastKey=${lastKey}: ${e?.message || e}`);
                    // non aggiorno il checkpoint: al riavvio riparto dallo stesso punto
                    break; // opzionale: oppure rethrow per far fallire il job
                }

                synced += batch.length;
                subject.next({ synced, total, lastKey });
            }

            this.logger.log(`✅ Sync completed. Total synced: ${synced}`);
            subject.complete();
        })().catch(err => subject.error(err));

        return subject.asObservable();
    }

    private async createIndexIfNotExists() {
        const uid = this.indexUid;
        const indexes = await this.meiliClient.getIndexes();
        const exists = indexes.results.some(i => i.uid === uid);

        if (!exists) {
            this.logger.log(`🔵 Creating index ${uid}...`);
            await this.meiliClient.createIndex(uid, { primaryKey: 'stableUuid' });
            await this.meiliClient.index(uid).updateSettings({
                searchableAttributes: [
                    'preferredName', 'synonyms', 'cmbId', 'canonicalSmiles',
                    'standardInchi', 'standardInchiKey',
                    'activities.targetName', 'activities.assayDescription',
                    'toxicityData.warningDescription',
                ],
                filterableAttributes: [
                    'molregno', 'maxPhase', 'moleculeType',
                    'naturalProduct', 'prodrug', 'blackBoxWarning',
                    'administrationRoutes.oral', 'administrationRoutes.parenteral', 'administrationRoutes.topical',
                    'properties.mwFreebase', 'properties.alogp', 'properties.hba', 'properties.hbd', 'properties.psa', 'properties.rtb',
                ],
            });
            this.logger.log(`✅ Index ${uid} created & configured.`);
        } else {
            this.logger.log(`🔵 Index ${uid} already exists.`);
        }
    }
}
