// src/app_modules/embeddings/services/embedding-sync-stream.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { EMB_CHECKPOINT, readEmbCk, writeEmbCk, resetEmbCk, ZERO_UUID, isUuid } from '../utils/emb-checkpoint.util';
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity';
import { EmbeddingClientService } from './embedding-client.service';
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv';

type Progress = {
    phase: 'seed' | 'embed' | 'done';
    totalSrc: number;
    totalPending: number;
    seeded: number;
    embedded: number;
    lastKey: string;
};

function toPgVec(v: number[] | null | undefined): string | null {
    if (!Array.isArray(v) || v.length === 0) return null;
    // pgvector accetta la forma [x,y,z]
    return `[${v.map(n => (Number.isFinite(n) ? n : 0)).join(',')}]`;
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

@Injectable()
export class EmbeddingSyncStreamService {
    private readonly logger = new Logger(EmbeddingSyncStreamService.name);

    // Tuneabili senza toccare il resto del codice
    private readonly BATCH = 10_000;
    private readonly CONCURRENCY = 8;
    private readonly PROGRESS_DEBOUNCE = 500; // ms minimi tra due progress burst
    private stopping = false;

    constructor(
        @InjectRepository(MoleculeIndexView)
        private readonly srcRepo: Repository<MoleculeIndexView>,

        @InjectRepository(MoleculeEmbedding, 'MercurionConn')
        private readonly dstRepo: Repository<MoleculeEmbedding>,

        @InjectDataSource('MercurionConn')
        private readonly mercurionDS: DataSource,

        private readonly embClient: EmbeddingClientService,
    ) { }

    /** Facoltativo: permette di chiedere lo stop “gentile” dall’esterno */
    stop() { this.stopping = true; }

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

            while (!this.stopping) {
                const batch = await this.srcRepo.find({
                    where: { stableUuid: MoreThan(lastKey) },
                    order: { stableUuid: 'ASC' },
                    take: this.BATCH,
                });
                if (batch.length === 0) break;

                // bulk upsert (stable_uuid, molregno, smiles)
                const values = batch.map((_, i) => `($${3 * i + 1},$${3 * i + 2},$${3 * i + 3})`).join(',');
                const params: (string | number)[] = [];
                for (const r of batch) {
                    params.push(r.stableUuid, r.doc.id, r.doc.canonicalSmiles ?? '');
                }

                await this.mercurionDS.query(
                    `INSERT INTO molecule_embeddings (stable_uuid,molregno,smiles)
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

            if (this.stopping) {
                this.logger.warn('⏹️ Stop richiesto durante SEED');
                subject.complete();
                return;
            }

            // 2) EMBED
            // calcola il backlog senza embedding
            const [{ count }] = await this.mercurionDS.query(
                `SELECT count(*)::int FROM molecule_embeddings WHERE embedding IS NULL`
            );
            const totalPending = Number(count) || 0;
            this.logger.log(`🔵 EMBED start pending=${totalPending}`);

            let embedded = 0;
            let lastProgressAt = 0;

            const sendProgress = (lastKeyHere: string) => {
                const now = Date.now();
                if (now - lastProgressAt >= this.PROGRESS_DEBOUNCE) {
                    lastProgressAt = now;
                    subject.next({ phase: 'embed', totalSrc, totalPending, seeded, embedded, lastKey: lastKeyHere });
                }
            };

            // worker-pool con retry
            const embedWithRetry = async (stable_uuid: string, smiles: string) => {
                // skip SMILES vuote
                if (!smiles || !smiles.trim()) {
                    this.logger.warn(`⚠️ SMILES vuota per ${stable_uuid}, salto`);
                    return;
                }

                const MAX_RETRIES = 4;
                for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        const vecArr = await this.embClient.getSmilesEmbedding(smiles);
                        const vec = toPgVec(vecArr);
                        if (!vec) {
                            throw new Error('Embedding vuoto o non valido');
                        }
                        await this.mercurionDS.query(
                            `UPDATE mercurion.molecule_embeddings
               SET embedding = $2::vector, updated_at = now()
               WHERE stable_uuid = $1`,
                            [stable_uuid, vec]
                        );
                        return;
                    } catch (e: any) {
                        const msg = e?.message || String(e);
                        const backoffMs = Math.min(2000 * (attempt + 1), 10_000); // backoff lineare soft
                        this.logger.warn(`↻ retry ${attempt + 1}/${MAX_RETRIES} embed ${stable_uuid}: ${msg} (wait ${backoffMs}ms)`);
                        await sleep(backoffMs);
                        if (attempt === MAX_RETRIES) {
                            this.logger.error(`❌ definitivo embed ${stable_uuid}: ${msg}`);
                        }
                    }
                }
            };

            while (!this.stopping) {
                const rows: { stable_uuid: string; smiles: string }[] = await this.mercurionDS.query(
                    `SELECT stable_uuid, smiles
           FROM mercurion.molecule_embeddings
           WHERE embedding IS NULL
           ORDER BY stable_uuid
           LIMIT $1`,
                    [this.BATCH]
                );
                if (rows.length === 0) break;

                let idx = 0;
                const worker = async () => {
                    while (!this.stopping && idx < rows.length) {
                        const i = idx++;
                        const row = rows[i];
                        await embedWithRetry(row.stable_uuid, row.smiles);
                        embedded++;

                        // aggiorna stato ogni 1000 embedded per non spammare + debounce
                        if (embedded % 1000 === 0) {
                            await writeEmbCk({ mode: 'embed', lastKey: row.stable_uuid, updatedAt: new Date().toISOString() });
                            sendProgress(row.stable_uuid);
                        }
                    }
                };

                await Promise.all(new Array(this.CONCURRENCY).fill(0).map(() => worker()));

                // flush fine lotto
                const lastHere = rows[rows.length - 1].stable_uuid;
                await writeEmbCk({ mode: 'embed', lastKey: lastHere, updatedAt: new Date().toISOString() });
                sendProgress(lastHere);
            }

            if (this.stopping) {
                this.logger.warn('⏹️ Stop richiesto durante EMBED');
                subject.complete();
                return;
            }

            await writeEmbCk({ mode: 'done', lastKey, updatedAt: new Date().toISOString() });
            subject.next({ phase: 'done', totalSrc, totalPending: 0, seeded, embedded, lastKey });
            subject.complete();
            this.logger.log(`✅ DONE seeded=${seeded} embedded=${embedded} → ${EMB_CHECKPOINT}`);
        })().catch(err => subject.error(err));

        return subject.asObservable();
    }
}
