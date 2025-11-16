import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Subject, Observable } from 'rxjs';

import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv';


import type { MeiliSearch, Index, EnqueuedTask, RecordAny } from 'meilisearch';
import { MoleculeNameI18n } from 'src/app_modules/translation/Models/entities/molecule-name-i18n.entity';

type TaskStatus = 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';

type Progress = {
    syncedDocs: number;
    totalRows: number;
    lastMolregno: number | null;
};

@Injectable()
export class MeiliPreferredNameItSyncService {
    private readonly logger = new Logger(MeiliPreferredNameItSyncService.name);
    private index: Index<RecordAny>;
    private readonly indexUid = 'molecule_details_chembl_36';

    constructor(
        // sorgente 1: Mercurion (traduzioni)
        @InjectRepository(MoleculeNameI18n, 'MercurionConn')
        private readonly nameRepo: Repository<MoleculeNameI18n>,

        // sorgente 2: chembl_36 (per mappare molregno -> stableUuid)
        @InjectRepository(MoleculeIndexView)
        private readonly molIndexRepo: Repository<MoleculeIndexView>,

        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch,
    ) { }

    async onModuleInit() {
        this.index = this.meiliClient.index(this.indexUid);
    }

    /** Polling portabile per i task Meili (copiato dal tuo stile) */
    private async waitForTaskPortable(
        taskUid: number,
        timeoutMs = 10 * 60_000,
        intervalMs = 500,
    ): Promise<{ status: TaskStatus; uid: number; error?: any }> {
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const t = canGetFromClient
                ? await c.getTask(taskUid)
                : (canGetFromNS ? await c.tasks.getTask(taskUid) : await i.getTask(taskUid));

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const status: TaskStatus = t.status;
            if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { status, uid: taskUid, error: t?.error };
            }

            if (Date.now() - start > timeoutMs) {
                throw new Error(`Timeout in attesa del task ${taskUid} (status=${status})`);
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
    }

    /**
     * Stream SSE: per batch prende le traduzioni (molregno, preferred_it),
     * le mappa su stableUuid e invia update a Meilisearch
     * aggiungendo il campo preferredNameIt.
     */
    syncPreferredNameItAsObservable(
        batchSize = 2_000,
    ): Observable<Progress> {
        const subject = new Subject<Progress>();

        (async () => {
            const totalRows = await this.nameRepo.count({
                where: { preferredIt: MoreThan('') }, // NOT NULL e non vuota
            });
            if (totalRows === 0) {
                this.logger.warn('⚠️ Nessuna riga con preferred_it valorizzata in molecule_name_i18n.');
                subject.complete();
                return;
            }

            this.logger.log(`🔵 Totale traduzioni pronte: ${totalRows}`);

            let syncedDocs = 0;
            let lastMolregno: number | null = null;

            while (true) {
                // 1) batch di righe tradotte, ordinate per molregno
                const batchNames = await this.nameRepo.find({
                    where: lastMolregno != null
                        ? { molregno: MoreThan(lastMolregno), preferredIt: MoreThan('') }
                        : { preferredIt: MoreThan('') },
                    order: { molregno: 'ASC' },
                    take: batchSize,
                });

                if (batchNames.length === 0) break;

                const mols = batchNames.map(r => r.molregno);

                // 2) prendi stableUuid corrispondenti da molecule_index_mv
                //    (molregno = doc.id)
                const indexRows = await this.molIndexRepo
                    .createQueryBuilder('v')
                    .select([
                        'v.stableUuid AS stable_uuid',
                        "(v.doc->>'id')::int AS molregno",
                    ])
                    .where("(v.doc->>'id')::int IN (:...mols)", { mols })
                    .getRawMany<{ stable_uuid: string; molregno: number }>();

                const mapMolToUuid = new Map<number, string>();
                for (const r of indexRows) {
                    mapMolToUuid.set(r.molregno, r.stable_uuid);
                }

                // 3) costruisci i documenti da mandare a Meilisearch
                const docs: Record<string, any>[] = [];
                for (const r of batchNames) {
                    const uuid = mapMolToUuid.get(r.molregno);
                    if (!uuid) {
                        // può succedere se hai qualche molregno non presente nella view
                        continue;
                    }
                    docs.push({
                        stableUuid: uuid,
                        preferredNameIt: r.preferredIt,
                    });
                }

                if (docs.length === 0) {
                    lastMolregno = batchNames[batchNames.length - 1].molregno;
                    continue;
                }

                try {
                    const task: EnqueuedTask = await this.index.addDocuments(docs, { primaryKey: 'stableUuid' });
                    const res = await this.waitForTaskPortable(task.taskUid);
                    if (res.status !== 'succeeded') {
                        this.logger.error(`❌ Task ${res.uid} ${res.status}. Error: ${JSON.stringify(res.error)}`);
                        break;
                    }
                    this.logger.log(`📦 Task ${res.uid} OK — docs=${docs.length}`);
                } catch (e: any) {
                    this.logger.error(`❌ addDocuments failed: ${e?.message || e}`);
                    break;
                }

                syncedDocs += docs.length;
                lastMolregno = batchNames[batchNames.length - 1].molregno;

                subject.next({ syncedDocs, totalRows, lastMolregno });
            }

            this.logger.log(`✅ Meili preferredNameIt sync completato. Docs aggiornati≈${syncedDocs}`);
            subject.complete();
        })().catch(err => {
            this.logger.error(`❌ syncPreferredNameItAsObservable error: ${err?.message || err}`);
            subject.error(err);
        });

        return subject.asObservable();
    }
}
