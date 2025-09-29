// src/app_modules/embeddings/services/embedding-sync-stream.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { Subject, Observable } from 'rxjs';

import {
    EMB_CHECKPOINT, readEmbCk, writeEmbCk, resetEmbCk,
    ZERO_UUID, isUuid
} from '../utils/emb-checkpoint.util';

import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity';
import { EmbeddingClientService } from './embedding-client.service';
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv';

type Phase = 'seed' | 'embed' | 'done';

type Progress = {
    phase: Phase;
    totalSrc: number;
    seeded: number;
    embedded: number;
    lastKey: string;
};

const DEFAULT_BATCH_SIZE = 2_500;
const DEFAULT_CONCURRENCY = 8;
const PROGRESS_DEBOUNCE_MS = 500;
const EXPECTED_DIM = 768;

function toPgVecOrThrow(v: number[], expectedDim = EXPECTED_DIM): string {
    if (!Array.isArray(v) || v.length === 0) throw new Error('Embedding vuoto');
    if (expectedDim && v.length !== expectedDim) {
        throw new Error(`Dim errata: atteso ${expectedDim}, ricevuto ${v.length}`);
    }
    // pgvector literal: [1,2,3]
    return `[${v.map(n => (Number.isFinite(n) ? n : 0)).join(',')}]`;
}

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

@Injectable()
export class EmbeddingSyncStreamService {
    private readonly logger = new Logger(EmbeddingSyncStreamService.name);
    private stopping = false;

    constructor(
        // sorgente: MV con JSON "doc"
        @InjectRepository(MoleculeIndexView)
        private readonly srcRepo: Repository<MoleculeIndexView>,

        // destinazione: tabella public.molecule_embeddings
        @InjectRepository(MoleculeEmbedding, 'MercurionConn')
        private readonly dstRepo: Repository<MoleculeEmbedding>,

        @InjectDataSource('MercurionConn')
        private readonly mercurionDS: DataSource,

        private readonly embClient: EmbeddingClientService,
    ) { }

    stop() { this.stopping = true; }

    private async getStartKeyDeterministic(restart: boolean): Promise<string> {
        if (!restart) {
            const ck = await readEmbCk();
            if (ck?.lastKey && isUuid(ck.lastKey)) {
                this.logger.log(`🟡 Ripartenza da checkpoint: ${ck.lastKey}`);
                return ck.lastKey;
            }
        } else {
            await resetEmbCk();
            this.logger.log('🧹 Restart: checkpoint azzerato.');
        }

        const first = await this.srcRepo
            .createQueryBuilder('v')
            .select(['v.stableUuid'])
            .orderBy('v.stableUuid', 'ASC')
            .limit(1)
            .getOne();

        if (!first?.stableUuid) {
            this.logger.warn('⚠️ molecule_index_mv è vuota: nulla da sincronizzare.');
            return ZERO_UUID;
        }

        this.logger.log(`🟢 Primo UUID rilevato: ${first.stableUuid}. Parto da ZERO_UUID per includerlo nel primo batch.`);
        return ZERO_UUID;
    }

    /**
     * Stream end-to-end: per batch fa
     *  1) SEED (upsert stable_uuid, molregno, smiles in target)
     *  2) EMBED (invia smiles a NATS via EmbeddingClientService, riceve embedding, update riga)
     * Usa keyset pagination su stableUuid e checkpoint a fine batch.
     */
    streamSync(
        restart = false,
        batchSize = DEFAULT_BATCH_SIZE,
        concurrency = DEFAULT_CONCURRENCY,
    ): Observable<Progress> {
        const subject = new Subject<Progress>();

        (async () => {
            let lastKey = await this.getStartKeyDeterministic(restart);

            const totalSrc = await this.srcRepo.count();
            if (totalSrc === 0) {
                this.logger.warn('⚠️ Nessuna riga nella view. Fine.');
                subject.complete();
                return;
            }
            this.logger.log(`🔵 Totale molecole da processare: ${totalSrc}`);

            let seeded = 0;
            let embedded = 0;

            let lastProgressAt = 0;
            const sendProgress = (phase: Phase, lastKeyHere: string) => {
                const now = Date.now();
                if (now - lastProgressAt >= PROGRESS_DEBOUNCE_MS) {
                    lastProgressAt = now;
                    subject.next({ phase, totalSrc, seeded, embedded, lastKey: lastKeyHere });
                }
            };

            // ciclo batch
            while (!this.stopping) {
                // 1) leggo batch dalla view
                const batch = await this.srcRepo.find({
                    where: { stableUuid: MoreThan(lastKey) },
                    order: { stableUuid: 'ASC' },
                    take: batchSize,
                });
                if (batch.length === 0) break;

                // 2) SEED: upsert su public.molecule_embeddings
                {
                    const values = batch.map((_, i) => `($${3 * i + 1},$${3 * i + 2},$${3 * i + 3})`).join(',');
                    const params: (string | number)[] = [];

                    for (const r of batch) {
                        const molregno = (r as any)?.doc?.id as number;
                        const smiles = (r as any)?.doc?.canonicalSmiles ?? '';
                        params.push(r.stableUuid, molregno, smiles);
                    }

                    await this.mercurionDS.query(
                        `INSERT INTO public.molecule_embeddings (stable_uuid, molregno, smiles)
             VALUES ${values}
             ON CONFLICT (stable_uuid) DO UPDATE
             SET molregno = EXCLUDED.molregno,
                 smiles   = EXCLUDED.smiles`,
                        params
                    );

                    seeded += batch.length;
                    const lastSeedKey = batch[batch.length - 1].stableUuid;
                    await writeEmbCk({ mode: 'seed', lastKey: lastSeedKey, updatedAt: new Date().toISOString() });
                    sendProgress('seed', lastSeedKey);
                }

                // 3) EMBED: per il batch appena seedato, invio SMILES a NATS e aggiorno `embedding`
                {
                    // preparo “lavori” solo per righe con SMILES non vuota
                    const jobs = batch
                        .map(r => ({
                            stable_uuid: r.stableUuid,
                            smiles: (r as any)?.doc?.canonicalSmiles as string | undefined
                        }))
                        .filter(j => !!j.smiles && !!j.smiles.trim());

                    let cursor = 0;

                    const worker = async () => {
                        while (!this.stopping && cursor < jobs.length) {
                            const i = cursor++;
                            const { stable_uuid, smiles } = jobs[i];

                            // retry con backoff per l’inferenza + update
                            const MAX_RETRIES = 4;
                            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                                try {
                                    const vecArr = await this.embClient.getSmilesEmbedding(smiles!); // NATS request-reply
                                    const vecLit = toPgVecOrThrow(vecArr, EXPECTED_DIM);

                                    const res: Array<{ ok: number }> = await this.mercurionDS.query(
                                        `UPDATE public.molecule_embeddings
                       SET embedding = $2::vector, updated_at = now()
                     WHERE stable_uuid = $1
                     RETURNING 1 AS ok`,
                                        [stable_uuid, vecLit]
                                    );

                                    if (!res || res.length === 0) {
                                        throw new Error('UPDATE 0 rows: stable_uuid non trovato nella tabella target');
                                    }

                                    embedded++;
                                    if (embedded % 1000 === 0) {
                                        await writeEmbCk({ mode: 'embed', lastKey: stable_uuid, updatedAt: new Date().toISOString() });
                                        sendProgress('embed', stable_uuid);
                                    }
                                    break; // ok, esco dal retry loop
                                } catch (e: any) {
                                    const msg = e?.message || String(e);
                                    const backoffMs = Math.min(2000 * (attempt + 1), 10_000);
                                    this.logger.warn(`↻ retry ${attempt + 1}/${MAX_RETRIES} embed ${stable_uuid}: ${msg} (wait ${backoffMs}ms)`);
                                    await sleep(backoffMs);
                                    if (attempt === MAX_RETRIES) {
                                        this.logger.error(`❌ definitivo embed ${stable_uuid}: ${msg}`);
                                    }
                                }
                            }
                        }
                    };

                    await Promise.all(new Array(Math.max(1, concurrency)).fill(0).map(() => worker()));
                }

                // 4) aggiorno checkpoint di batch e proseguo
                lastKey = batch[batch.length - 1].stableUuid;
                await writeEmbCk({ mode: 'embed', lastKey, updatedAt: new Date().toISOString() });
                sendProgress('embed', lastKey);
            }

            if (this.stopping) {
                this.logger.warn('⏹️ Stop richiesto.');
                subject.complete();
                return;
            }

            await writeEmbCk({ mode: 'done', lastKey, updatedAt: new Date().toISOString() });
            subject.next({ phase: 'done', totalSrc, seeded, embedded, lastKey });
            subject.complete();
            this.logger.log(`✅ DONE seeded=${seeded} embedded=${embedded} → ${EMB_CHECKPOINT}`);
        })().catch(err => {
            // loggo esplicitamente gli errori che finirebbero solo in subject.error
            this.logger.error(`❌ streamSync error: ${err?.message || err}`);
            subject.error(err);
        });

        return subject.asObservable();
    }
}
