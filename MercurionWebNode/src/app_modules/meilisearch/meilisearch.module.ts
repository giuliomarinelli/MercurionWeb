import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { meilisearchClientProviders } from './meilisearch.clients'
import { MoleculeSearchService } from './services/molecule-search.service'
import { MoleculeSearchResolver } from './resolvers/molecule-search.resolver'
import { MoleculeService } from './services/molecule.service'
import { MoleculeResolver } from './resolvers/molecule.resolver'
import { SecurityAuditService } from './services/security-audit.service'
import { CustomMoleculeItemEntity } from '../molecule-collection/models/entities/custom-molecule-item.entity'
import { MercurionAIModule } from '../mercurion-ai/mercurion-ai.module'

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([CustomMoleculeItemEntity]),
        MercurionAIModule
    ],
    providers: [
        ...meilisearchClientProviders,
        MoleculeSearchService,
        MoleculeSearchResolver,
        MoleculeService,
        MoleculeResolver,
        SecurityAuditService
    ],
    exports: [
        MoleculeService,
        'MEILISEARCH_CLIENT',
        'MEILISEARCH_LOG_CLIENT',
        SecurityAuditService,
    ]
})
export class MeilisearchModule { }
