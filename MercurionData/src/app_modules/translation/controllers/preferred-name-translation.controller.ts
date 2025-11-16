import { Controller, Post, Query } from '@nestjs/common';
import { PreferredNameTranslationService } from '../services/preferred-name-translation.service';

@Controller('molecule-name-i18n')
export class PreferredNameTranslationController {
  constructor(
    private readonly svc: PreferredNameTranslationService,
  ) {}

  @Post('translate-missing')
  async translateMissing(
    @Query('model') model = 'gpt-4.1',
    @Query('batchSize') batchSize?: string,
  ) {
    const bs = Math.max(1, Number(batchSize ?? '50') || 50);
    const startedAt = Date.now();   

    const res = await this.svc.translateAllMissing(model, bs);

    const elapsedMs = Date.now() - startedAt;
    return {
      ok: true,
      ...res,
      elapsedMs,
    };
  }
}
