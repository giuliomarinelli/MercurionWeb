import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CopyToDistService implements OnModuleInit {

    private readonly logger = new Logger(CopyToDistService.name)

    private readonly keysSourcePath = path.join(__dirname, '../config/keys')
    private readonly keysDistPath = path.join(__dirname, '../../dist/config/keys')
    private readonly templatesSourcePath = path.join(__dirname, '../app_modules/notification/email-templates')
    private readonly templatesDistPath = path.join(__dirname, '../../dist/app_modules/notification/email-templates')

    async onModuleInit() {
        try {
            // Crea la cartella se non esiste
            if (!fs.existsSync(this.keysDistPath)) {
                fs.mkdirSync(this.keysDistPath, { recursive: true })
            }
            if (!fs.existsSync(this.templatesDistPath)) {
                fs.mkdirSync(this.templatesDistPath, { recursive: true })
            }

            // Copia tutti i file della cartella `config/keys/`
            const files = fs.readdirSync(this.keysSourcePath)
            for (const file of files) {
                fs.copyFileSync(
                    path.join(this.keysSourcePath, file),
                    path.join(this.keysDistPath, file)
                );
            }
            const files2 = fs.readdirSync(this.templatesSourcePath)
            for (const file of files2) {
                fs.copyFileSync(
                    path.join(this.templatesSourcePath, file),
                    path.join(this.templatesDistPath, file)
                );
            }

            this.logger.log('✅ Chiavi RSA e template email copiati con successo in dist/')
        } catch (error) {
            this.logger.error('❌ Errore durante la copia delle chiavi RSA e dei template:', error)
        }
    }
}
