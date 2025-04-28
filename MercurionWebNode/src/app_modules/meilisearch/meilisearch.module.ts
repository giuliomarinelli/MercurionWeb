import { Module } from '@nestjs/common';
import { MoleculeSyncService } from './services/molecule-sync.service';
import { ConfigService } from '@nestjs/config';
import { Meilisearch } from 'meilisearch';
import { ChemblModule } from '../chembl/chembl.module';
import { MoleculeDetailSyncService } from './services/molecule-detail-sync.service';
import { MoleculeSearchService } from './services/molecule-search.service';
import { MoleculeSearchResolver } from './resolvers/molecule-search-resolver';

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
        MoleculeDetailSyncService,
        MoleculeSearchService,
        MoleculeSearchResolver
    ],
    exports: [MoleculeSyncService, MoleculeDetailSyncService]

})
export class MeilisearchModule { }
