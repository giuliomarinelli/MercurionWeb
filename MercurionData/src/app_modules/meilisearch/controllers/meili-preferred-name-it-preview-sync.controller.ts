import { Controller, Query, Sse, MessageEvent } from "@nestjs/common";
import { MeiliPreferredNameItPreviewSyncService } from "../services/meili-preferred-name-it-preview.service";
import { map } from "rxjs/operators";
import { Observable } from "rxjs";

@Controller('meili-preferred-name-it-preview-sync')
export class MeiliPreferredNameItPreviewSyncController {
  constructor(
    private readonly svc: MeiliPreferredNameItPreviewSyncService,
  ) {}

  @Sse('/run')
  run(
    @Query('batch_size') batchSize = 2_000,
  ): Observable<MessageEvent> {
    return this.svc
      .syncPreferredNameItForPreviewsAsObservable(Number(batchSize))
      .pipe(map(p => ({ data: p })));
  }
}
