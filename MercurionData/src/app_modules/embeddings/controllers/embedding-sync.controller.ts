// src/app_modules/embeddings/controllers/embedding-sync.controller.ts
import { Controller, Query, Sse, MessageEvent } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { EmbeddingSyncStreamService } from '../services/embedding-sync-stream.service';

@Controller('embeddings-sync')
export class EmbeddingSyncController {
    constructor(private readonly svc: EmbeddingSyncStreamService) { }

    @Sse('/stream') // GET /embeddings-sync/stream?restart=false
    stream(@Query('restart') restart = 'false'): Observable<MessageEvent> {
        const rest = String(restart).toLowerCase() === 'true';
        return this.svc.streamSync(rest).pipe(map(progress => ({ data: progress })));
    }
}
