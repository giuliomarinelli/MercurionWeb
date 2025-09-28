
import { Controller, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MoleculePreviewSyncService } from '../../services/molecule-preview-sync.service';

@Controller('chembl-36-to-meilisearch-sync')
export class Chembl36ToMeilisearchSyncController {

    constructor(private readonly syncSvc: MoleculePreviewSyncService) { }

    @Sse('/preview') // GET /chembl-36-to-meilisearch-sync/preview
    previewSync(@Query('offset') offset = 0): Observable<MessageEvent> {
        return this.syncSvc.syncAllMoleculesAsObservable(offset).pipe(
            map(progress => ({ data: progress })) // <- SSE: { event?, id?, data }
        );
    }
}

