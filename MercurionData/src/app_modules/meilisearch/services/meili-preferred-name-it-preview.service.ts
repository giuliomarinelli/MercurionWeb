import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Subject, Observable } from 'rxjs';

import { MoleculeNameI18n } from 'src/app_modules/translation/Models/entities/molecule-name-i18n.entity';
import type { MeiliSearch, Index, EnqueuedTask, RecordAny } from 'meilisearch';

type TaskStatus = 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';

type Progress = {
  syncedDocs: number;
  totalRows: number;
  lastMolregno: number | null;
};

@Injectable()
export class MeiliPreferredNameItPreviewSyncService {
  private readonly logger = new Logger(MeiliPreferredNameItPreviewSyncService.name);
  private index: Index<RecordAny>;
  private readonly indexUid = 'molecule_previews_chembl_36';

  constructor(
    @InjectRepository(MoleculeNameI18n, 'MercurionConn')
    private readonly nameRepo: Repository<MoleculeNameI18n>,

    @Inject('MEILISEARCH_CLIENT')
    private readonly meiliClient: MeiliSearch,
  ) {}

  async onModuleInit() {
    this.index = this.meiliClient.index(this.indexUid);
  }

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
   * Per batch:
   *  - legge (molregno, preferredIt) da molecule_name_i18n
   *  - usa molregno direttamente come `id` dei documenti preview in Meilisearch
   *  - aggiunge/aggiorna il campo `preferredNameIt`
   */
  syncPreferredNameItForPreviewsAsObservable(
    batchSize = 2_000,
  ): Observable<Progress> {
    const subject = new Subject<Progress>();

    (async () => {
      const totalRows = await this.nameRepo.count({
        where: { preferredIt: MoreThan('') },
      });
      if (totalRows === 0) {
        this.logger.warn('⚠️ Nessuna riga con preferred_it valorizzata in molecule_name_i18n.');
        subject.complete();
        return;
      }

      this.logger.log(`🔵 [preview] Totale traduzioni pronte: ${totalRows}`);

      let syncedDocs = 0;
      let lastMolregno: number | null = null;

      while (true) {
        const batchNames = await this.nameRepo.find({
          where: lastMolregno != null
            ? { molregno: MoreThan(lastMolregno), preferredIt: MoreThan('') }
            : { preferredIt: MoreThan('') },
          order: { molregno: 'ASC' },
          take: batchSize,
        });

        if (batchNames.length === 0) break;

        // qui la magia: id del documento = molregno
        const docs: Record<string, any>[] = batchNames.map(r => ({
          id: r.molregno,              // primaryKey nell'indice preview
          preferredNameIt: r.preferredIt,
        }));

        try {
          const task: EnqueuedTask = await this.index.addDocuments(docs, { primaryKey: 'id' });
          const res = await this.waitForTaskPortable(task.taskUid);
          if (res.status !== 'succeeded') {
            this.logger.error(`❌ [preview] Task ${res.uid} ${res.status}. Error: ${JSON.stringify(res.error)}`);
            break;
          }
          this.logger.log(`📦 [preview] Task ${res.uid} OK — docs=${docs.length}`);
        } catch (e: any) {
          this.logger.error(`❌ [preview] addDocuments failed: ${e?.message || e}`);
          break;
        }

        syncedDocs += docs.length;
        lastMolregno = batchNames[batchNames.length - 1].molregno;
        subject.next({ syncedDocs, totalRows, lastMolregno });
      }

      this.logger.log(`✅ [preview] preferredNameIt sync completato. Docs aggiornati≈${syncedDocs}`);
      subject.complete();
    })().catch(err => {
      this.logger.error(`❌ syncPreferredNameItForPreviewsAsObservable error: ${err?.message || err}`);
      subject.error(err);
    });

    return subject.asObservable();
  }
}
