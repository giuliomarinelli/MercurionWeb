import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CopyToDistService implements OnModuleInit {

    private readonly logger = new Logger(CopyToDistService.name)

    private readonly sourcePath = path.join(__dirname, '../config/keys')
    private readonly distPath = path.join(__dirname, '../../dist/config/keys')

    async onModuleInit() {
        try {
            // Crea la cartella se non esiste
            if (!fs.existsSync(this.distPath)) {
                fs.mkdirSync(this.distPath, { recursive: true })
            }

            // Copia tutti i file della cartella `config/keys/`
            const files = fs.readdirSync(this.sourcePath)
            for (const file of files) {
                fs.copyFileSync(
                    path.join(this.sourcePath, file),
                    path.join(this.distPath, file)
                );
            }

            this.logger.log('✅ Chiavi RSA copiate con successo in dist/')
        } catch (error) {
            this.logger.error('❌ Errore durante la copia delle chiavi RSA:', error)
        }
    }
}
