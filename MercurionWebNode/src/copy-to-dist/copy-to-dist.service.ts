import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CopyToDistService implements OnModuleInit {
  private readonly logger = new Logger(CopyToDistService.name);

  private readonly isDev = process.env.NODE_ENV !== 'production';

  private readonly keysSourcePath = path.join(process.cwd(), 'src/config/keys');
  private readonly keysDistPath = path.join(process.cwd(), 'dist/config/keys');

  private readonly templatesSourcePath = path.join(process.cwd(), 'src/app_modules/notification/email-templates');
  private readonly templatesDistPath = path.join(process.cwd(), 'dist/app_modules/notification/email-templates');

  async onModuleInit() {
    if (!this.isDev) {
      this.logger.debug('🟡 CopyToDistService disabilitato in ambiente di produzione.');
      return;
    }

    try {
      this.copyDir(this.keysSourcePath, this.keysDistPath);
      this.copyDir(this.templatesSourcePath, this.templatesDistPath);

      this.logger.log('✅ Chiavi RSA e template email copiati con successo in dist/');
    } catch (error) {
      this.logger.error('❌ Errore durante la copia dei file in dist:', error);
    }
  }

  private copyDir(src: string, dest: string) {
    if (!fs.existsSync(src)) {
      this.logger.warn(`⚠️ La sorgente ${src} non esiste. Niente da copiare.`);
      return;
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
  }
}
