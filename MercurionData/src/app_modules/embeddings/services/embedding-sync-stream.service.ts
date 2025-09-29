// src/app_modules/embeddings/services/embedding-sync-stream.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { EMB_CHECKPOINT, readEmbCk, writeEmbCk, resetEmbCk, ZERO_UUID, isUuid } from '../utils/emb-checkpoint.util';
import { MoleculeIndexMinView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-min.entity';
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity';
import { EmbeddingClientService } from './embedding-client.service';

function toPgVec(v: number[]) { return `[${v.join(',')}]`; }

type Progress = {
    phase: 'seed' | 'embed' | 'done';
    totalSrc: number;      // righe sorgente chembl (per seed)
    totalPending: number;  // righe senza embedding (per embed)
    seeded: number;
    embedded: number;
    lastKey: string;
};

@Injectable()
export class EmbeddingSyncStreamService {
    private readonly logger = new Logger(EmbeddingSyncStreamService.name);
    private readonly BATCH = 10_000;
    private readonly CONCURRENCY = 8;

    constructor(
        @InjectRepository(MoleculeIndexMinView)
        private readonly srcRepo: Repository<MoleculeIndexMinView>,

        @InjectRepository(MoleculeEmbedding, 'MercurionConn')
        private readonly dstRepo: Repository<MoleculeEmbedding>,

        @InjectDataSource('MercurionConn')
        private readonly mercurionDS: DataSource,

        private readonly embClient: EmbeddingClientService,
    ) { }

    /** Stream end-to-end: SEED -> EMBED (riprende da checkpoint se restart=false) */
    streamSync(restart = false): Observable<Progress> {
        const subject = new Subject<Progress>();

        (async () => {
            // 0) punto di ripartenza
            let ck = await readEmbCk();
            if (restart || !ck) { await resetEmbCk(); ck = null; }

            // 1) SEED
            let lastKey = ck?.mode === 'seed' && isUuid(ck?.lastKey) ? ck.lastKey : ZERO_UUID;
            const totalSrc = await this.srcRepo.count();
            let seeded = 0;

            this.logger.log(`🔵 SEED start (from ${lastKey === ZERO_UUID ? 'ZERO' : lastKey}) totalSrc=${totalSrc}`);

            while (true) {
                const batch = await this.srcRepo.find({
                    where: { stableUuid: MoreThan(lastKey) },
                    order: { stableUuid: 'ASC' },
                    take: this.BATCH,
                });
                if (batch.length === 0) break;

                // bulk upsert (stable_uuid, molregno, smiles)
                const values = batch.map((_, i) => `($${3 * i + 1},$${3 * i + 2},$${3 * i + 3})`).join(',');
                const params: any[] = [];
                for (const r of batch) params.push(r.stableUuid, r.molregno, r.smiles ?? '');

                await this.mercurionDS.query(
                    `INSERT INTO mercurion.molecule_embeddings (stable_uuid,molregno,smiles)
           VALUES ${values}
           ON CONFLICT (stable_uuid) DO UPDATE
           SET molregno=EXCLUDED.molregno, smiles=EXCLUDED.smiles`,
                    params
                );

                seeded += batch.length;
                lastKey = batch[batch.length - 1].stableUuid;

                await writeEmbCk({ mode: 'seed', lastKey, updatedAt: new Date().toISOString() });
                subject.next({ phase: 'seed', totalSrc, totalPending: 0, seeded, embedded: 0, lastKey });
            }

            // 2) EMBED
            // calcola il backlog senza embedding
            const [{ count }] = await this.mercurionDS.query(
                `SELECT count(*)::int FROM mercurion.molecule_embeddings WHERE embedding IS NULL`
            );
            const totalPending = Number(count) || 0;
            this.logger.log(`🔵 EMBED start pending=${totalPending}`);

            let embedded = ck?.mode === 'embed' ? 0 : 0; // contatore locale

            // pipeline a lotti; ogni lotto fa concurrency sugli item
            while (true) {
                const rows: { stable_uuid: string; smiles: string }[] = await this.mercurionDS.query(
                    `SELECT stable_uuid, smiles
           FROM mercurion.molecule_embeddings
           WHERE embedding IS NULL
           ORDER BY stable_uuid
           LIMIT $1`, [this.BATCH]
                );
                if (rows.length === 0) break;

                // worker-pool
                let idx = 0;
                const worker = async () => {
                    while (idx < rows.length) {
                        const i = idx++;
                        const row = rows[i];
                        try {
                            const vec = await this.embClient.getSmilesEmbedding(row.smiles);
                            await this.mercurionDS.query(
                                `UPDATE mercurion.molecule_embeddings
                 SET embedding = $2::vector, updated_at = now()
                 WHERE stable_uuid = $1`,
                                [row.stable_uuid, toPgVec(vec)]
                            );
                        } catch (e: any) {
                            this.logger.error(`❌ embed ${row.stable_uuid}: ${e?.message || e}`);
                        }
                        embedded++;
                        // aggiorna stato ogni 1000 per non spammare
                        if (embedded % 1000 === 0) {
                            await writeEmbCk({ mode: 'embed', lastKey: row.stable_uuid, updatedAt: new Date().toISOString() });
                            subject.next({ phase: 'embed', totalSrc, totalPending, seeded, embedded, lastKey: row.stable_uuid });
                        }
                    }
                };
                await Promise.all(new Array(this.CONCURRENCY).fill(0).map(() => worker()));

                // flush fine lotto
                const lastHere = rows[rows.length - 1].stable_uuid;
                await writeEmbCk({ mode: 'embed', lastKey: lastHere, updatedAt: new Date().toISOString() });
                subject.next({ phase: 'embed', totalSrc, totalPending, seeded, embedded, lastKey: lastHere });
            }

            await writeEmbCk({ mode: 'done', lastKey, updatedAt: new Date().toISOString() });
            subject.next({ phase: 'done', totalSrc, totalPending: 0, seeded, embedded, lastKey });
            subject.complete();
            this.logger.log(`✅ DONE seeded=${seeded} embedded=${embedded} → ${EMB_CHECKPOINT}`);
        })().catch(err => subject.error(err));

        return subject.asObservable();
    }
}
