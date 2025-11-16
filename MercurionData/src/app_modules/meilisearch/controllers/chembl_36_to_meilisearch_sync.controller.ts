
import { Controller, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MoleculePreviewSyncService } from '../services/molecule-preview-sync.service';
import { MoleculeDetailSyncService } from '../services/molecule-detail-sync.service';

@Controller('chembl-36-to-meilisearch-sync')
export class Chembl36ToMeilisearchSyncController {

    constructor(
        private readonly prevSyncSvc: MoleculePreviewSyncService,
        private readonly detSyncService: MoleculeDetailSyncService
    ) { }

    @Sse('/preview') // GET /chembl-36-to-meilisearch-sync/preview
    previewSync(@Query('offset') offset = 0): Observable<MessageEvent> {
        return this.prevSyncSvc.syncAllMoleculesAsObservable(offset).pipe(
            map(progress => ({ data: progress })) // <- SSE: { event?, id?, data }
        );
    }

    @Sse('/details') // GET /chembl-36-to-meilisearch-sync/details?startKey=<uuid>&batchSize=5000
    detailsSync(
        @Query('batch_size') batchSize = 15_000,
        @Query('restart') restart = false
    ): Observable<MessageEvent> {
        return this.detSyncService.syncAllAsObservable(Number(batchSize), restart).pipe(
            map(progress => ({ data: progress }))
        );
    }
}

