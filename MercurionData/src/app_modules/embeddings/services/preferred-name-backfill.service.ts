// src/app_modules/embeddings/services/preferred-name-sync.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv';
import type { MoleculeDoc } from 'src/app_modules/chembl_36/Models/DTO/molecule-detail.dtos';
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity';
import { CHECKPOINT_FILEPATH, isUuid, readCheckpoint, resetCheckpoint, writeCheckpoint, ZERO_UUID } from 'src/app_modules/meilisearch/utils/sync-checkpoint.util';



@Injectable()
export class PreferredNameSyncService {
    private readonly logger = new Logger(PreferredNameSyncService.name);

    constructor(
        // default connection -> chembl_36
        @InjectRepository(MoleculeIndexView)
        private readonly moleculeRepo: Repository<MoleculeIndexView>,

        // second connection -> mercurion
        @InjectRepository(MoleculeEmbedding, 'MercurionConn')
        private readonly embeddingRepo: Repository<MoleculeEmbedding>,
    ) { }

    /** SSE stream: backfill preferred_name in batch. */
    syncPreferredNamesAsObservable(
        batchSize = 10_000,
        restart = false,
        overwriteNulls = false, // se true, scrive NULL (di solito NO)
    ): Observable<{ synced: number; total: number; lastKey: string; updatedRows?: number }> {
        const subject = new Subject<{ synced: number; total: number; lastKey: string; updatedRows?: number }>();

        (async () => {
            let lastKey = await this.getStartKey(restart);

            const total = await this.moleculeRepo.count();
            if (total === 0) {
                this.logger.warn('⚠️ Nessuna riga nella MV.');
                subject.complete();
                return;
            }
            this.logger.log(`🔵 Totale righe sorgente: ${total}`);

            let synced = 0;

            while (true) {
                const batch = await this.moleculeRepo.find({
                    where: { stableUuid: MoreThan(lastKey) },
                    order: { stableUuid: 'ASC' },
                    take: batchSize,
                });
                if (batch.length === 0) break;

                // estrai (stable_uuid, preferred_name)
                // per sicurezza: trim e normalizzazione degli empty string a null
                const uuids: string[] = [];
                const names: (string | null)[] = [];
                for (const row of batch) {
                    const d = (row as any).doc as MoleculeDoc | undefined;
                    const raw = d?.preferredName ?? null;
                    const val = typeof raw === 'string' ? raw.trim() : null;
                    // Se non vogliamo sovrascrivere con NULL, allora pushiamo NULL
                    // ma il WHERE del UPDATE lo esclude.
                    uuids.push(row.stableUuid);
                    names.push(val || null);
                }

                // UPDATE bulk via unnest (solo dove esiste la riga in molecule_embeddings)
                // - non inserisce nulla
                // - non tocca le altre colonne
                // - opzionale: non sovrascrive con NULL a meno che overwriteNulls=true
                const whereNullGuard = overwriteNulls ? '' : 'AND v.preferred_name IS NOT NULL';
                const sql = `
          UPDATE molecule_embeddings AS me
          SET preferred_name = v.preferred_name,
              updated_at = NOW()
          FROM (
            SELECT unnest($1::uuid[]) AS stable_uuid,
                   unnest($2::varchar[]) AS preferred_name
          ) AS v
          WHERE me.stable_uuid = v.stable_uuid
            ${whereNullGuard}
            AND me.preferred_name IS DISTINCT FROM v.preferred_name
        `;
                const res: any = await this.embeddingRepo.query(sql, [uuids, names]);
                // postgres driver solitamente non torna rowCount qui via typeorm.query;
                // se disponibile lo pubblichiamo
                const updatedRows: number | undefined = typeof res?.rowCount === 'number' ? res.rowCount : undefined;

                lastKey = batch[batch.length - 1].stableUuid;
                await this.safeWriteCheckpoint(lastKey);

                synced += batch.length;
                subject.next({ synced, total, lastKey, updatedRows });
            }

            this.logger.log(`✅ Backfill preferred_name finito. Righe lette: ${synced}`);
            subject.complete();
        })().catch(err => subject.error(err));

        return subject.asObservable();
    }

    // --- helpers ---------------------------------------------------------------

    private async getStartKey(restart: boolean): Promise<string> {
        if (!restart) {
            const ck = await readCheckpoint();
            if (ck?.lastKey && isUuid(ck.lastKey)) {
                this.logger.log(`🟡 Riparto da checkpoint: ${ck.lastKey}`);
                return ck.lastKey;
            }
        } else {
            await resetCheckpoint();
            this.logger.log('🧹 Restart: checkpoint azzerato.');
        }

        const first = await this.moleculeRepo
            .createQueryBuilder('v')
            .select(['v.stableUuid'])
            .orderBy('v.stableUuid', 'ASC')
            .limit(1)
            .getOne();

        if (!first?.stableUuid) {
            this.logger.warn('⚠️ MV vuota.');
            return ZERO_UUID;
        }
        this.logger.log(`🟢 Primo UUID rilevato: ${first.stableUuid}. Parto da ZERO_UUID per includerlo.`);
        return ZERO_UUID;
    }

    private async safeWriteCheckpoint(lastKey: string) {
        try {
            await writeCheckpoint({ lastKey, updatedAt: new Date().toISOString() });
            this.logger.log(`💾 Checkpoint -> ${CHECKPOINT_FILEPATH} (lastKey=${lastKey})`);
        } catch (e: any) {
            this.logger.error(`❌ Checkpoint write fallita: ${e?.message || e}`);
        }
    }
}
