// src/app_modules/embeddings/controllers/embedding-sync.controller.ts
import { Controller, Query, Sse, MessageEvent } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { EmbeddingSyncStreamService } from '../services/embedding-sync-stream.service';
import { PreferredNameSyncService } from '../services/preferred-name-backfill.service';

@Controller('embeddings-sync')
export class EmbeddingSyncController {
    constructor(
        private readonly embSvc: EmbeddingSyncStreamService,
        private readonly prfSvc: PreferredNameSyncService
    ) { }

    @Sse('/stream')
    stream(
        @Query('restart') restart = 'false',
        @Query('batchSize') batchSize?: string,
        @Query('concurrency') concurrency?: string,
    ): Observable<MessageEvent> {
        const rest = String(restart).toLowerCase() === 'true';
        const bs = Math.max(1, Number(batchSize ?? '2500') || 2500);
        const cc = Math.max(1, Number(concurrency ?? '8') || 8);

        return this.embSvc
            .streamSync(rest, bs, cc)
            .pipe(map(p => ({ data: p })));
    }

    @Sse('/preferred-names')
    preferredNames(
        @Query('batch_size') batchSize = 10_000,
        @Query('restart') restart = false,
        @Query('overwrite_nulls') overwriteNulls = false,
    ): Observable<MessageEvent> {
        return this.prfSvc
            .syncPreferredNamesAsObservable(Number(batchSize), restart === true, overwriteNulls === true)
            .pipe(map(progress => ({ data: progress })));
    }
}
    

