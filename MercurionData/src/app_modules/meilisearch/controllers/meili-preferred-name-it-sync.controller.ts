import { Controller, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MeiliPreferredNameItSyncService } from '../services/meili-preferred-name-it-sync.service';

@Controller('meili-preferred-name-it-sync')
export class MeiliPreferredNameItSyncController {
    constructor(
        private readonly svc: MeiliPreferredNameItSyncService,
    ) { }

    @Sse('/run')
    run(
        @Query('batch_size') batchSize = 2_000,
    ): Observable<MessageEvent> {
        return this.svc
            .syncPreferredNameItAsObservable(Number(batchSize))
            .pipe(map(p => ({ data: p })));
    }
}
