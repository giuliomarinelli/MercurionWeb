// src/app_modules/i18n/controllers/molecule-name-i18n-seed.controller.ts
import { Controller, Post } from '@nestjs/common';
import { MoleculeNameI18nSeedService } from '../molecule-name-i18n.service';


@Controller('molecule-name-i18n')
export class MoleculeNameI18nSeedController {

  constructor(
    private readonly seedSvc: MoleculeNameI18nSeedService,
  ) {}

  @Post('seed')
  async seed() {
    const startedAt = Date.now();
    const result = await this.seedSvc.seedAll(1_000); 
    const elapsedMs = Date.now() - startedAt;

    return {
      ok: true,
      ...result,
      elapsedMs,
    };
  }
}
