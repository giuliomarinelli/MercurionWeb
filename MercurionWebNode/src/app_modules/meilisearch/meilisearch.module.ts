import { Module } from '@nestjs/common';
import { MoleculeSyncService } from './services/molecule-sync.service';
import { ConfigService } from '@nestjs/config';
import { Meilisearch } from 'meilisearch';
import { ChemblModule } from '../chembl/chembl.module';
import { MoleculeDetailSyncService } from './services/molecule-detail-sync.service';

@Module({
    imports: [ChemblModule],
    providers: [
        MoleculeSyncService,
        {
            provide: 'MEILISEARCH_CLIENT',
            useFactory: (configService: ConfigService) => new Meilisearch({
                host: configService.get<string>('Meilisearch.host') as string,
                apiKey: configService.get<string>('Meilisearch.masterKey')
            }),
            inject: [ConfigService]
        },
        MoleculeDetailSyncService
    ],
    exports: [MoleculeSyncService]

})
export class MeilisearchModule { }
