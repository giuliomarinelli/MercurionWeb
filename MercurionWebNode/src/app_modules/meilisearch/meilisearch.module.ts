import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch } from 'meilisearch';
import { MoleculeSearchService } from './services/molecule-search.service';
import { MoleculeSearchResolver } from './resolvers/molecule-search.resolver';
import { MeiliLoggerService } from './services/meili-logger.service';
import { MoleculeService } from './services/molecule.service';
import { MoleculeResolver } from './resolvers/molecule.resolver';
import { MoleculeCollectionModule } from '../molecule-collection/molecule-collection.module';
import { SecurityAuditService } from './services/security-audit.service';

@Module({
    imports: [forwardRef(() => MoleculeCollectionModule)],
    providers: [
        {
            provide: 'MEILISEARCH_CLIENT',
            useFactory: (configService: ConfigService) => new Meilisearch({
                host: configService.get<string>('Meilisearch.host') as string,
                apiKey: configService.get<string>('Meilisearch.masterKey')
            }),
            inject: [ConfigService]
        },
        MoleculeSearchService,
        MoleculeSearchResolver,
        MeiliLoggerService,
        MoleculeService,
        MoleculeResolver,
        SecurityAuditService
    ],
    exports: [
        MoleculeService,
        'MEILISEARCH_CLIENT',
        SecurityAuditService,
        MeiliLoggerService
    ]

})
export class MeilisearchModule { }
