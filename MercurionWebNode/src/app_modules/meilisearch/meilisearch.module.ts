import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meilisearch } from 'meilisearch';
import { MoleculeSearchService } from './services/molecule-search.service';
import { MoleculeSearchResolver } from './resolvers/molecule-search.resolver';
import { MoleculeService } from './services/molecule.service';
import { MoleculeResolver } from './resolvers/molecule.resolver';
import { SecurityAuditService } from './services/security-audit.service';
import { CustomMoleculeItemEntity } from '../molecule-collection/models/entities/custom-molecule-item.entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([CustomMoleculeItemEntity])
    ],
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
        MoleculeService,
        MoleculeResolver,
        SecurityAuditService
    ],
    exports: [
        MoleculeService,
        'MEILISEARCH_CLIENT',
        SecurityAuditService,
    ]
})
export class MeilisearchModule { }
