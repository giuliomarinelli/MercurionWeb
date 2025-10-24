import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChEMBLMoleculeItemEntity } from './Models/entities/chembl-molecule-item.entity';
import { CustomMoleculeItemEntity } from './Models/entities/custom-molecule-item.entity';
import { MoleculeCollection } from './Models/entities/molecule-collection.entity';
import { MoleculeCollectionItemJoin } from './Models/entities/molecule-collection-item-join.entity';
import { MoleculeCollectionItemEntity } from './Models/entities/molecule-collection-item.entity';
import { MoleculeCollectionService } from './services/molecule-collection.service';
import { MoleculeCollectionItemService } from './services/molecule-collection-item.service';
import { MoleculeCollectionResolver } from './resolvers/molecule-collection.resolver';
import { MoleculeCollectionItemResolver } from './resolvers/molecule-collection-item.resolver';
import { MoleculeCollectionItemJoinService } from './services/molecule-collection-item-join.service';
import { CustomMoleculeItemService } from './services/custom-molecule-item.service';
import { ChEMBLMoleculeItemResolver } from './resolvers/chembl-molecule-item.resolver';
import { CustomMoleculeItemResolver } from './resolvers/custom-molecule-item.resolver';
import { ChEMBLMoleculeItemService } from './services/chembl-molecule-item.service';
import { UserModule } from '../user/user.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { History } from '../history/Models/entities/history.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChEMBLMoleculeItemEntity,
            CustomMoleculeItemEntity,
            MoleculeCollection,
            MoleculeCollectionItemJoin,
            MoleculeCollectionItemEntity,
            History
        ]),
        forwardRef(() => UserModule),
        forwardRef(() => MeilisearchModule)
    ],
    providers: [
        MoleculeCollectionService,
        MoleculeCollectionItemService,
        MoleculeCollectionResolver,
        MoleculeCollectionItemResolver,
        MoleculeCollectionItemJoinService,
        CustomMoleculeItemService,
        ChEMBLMoleculeItemResolver,
        CustomMoleculeItemResolver,
        ChEMBLMoleculeItemService
    ],
    exports: [
        TypeOrmModule,
        ChEMBLMoleculeItemService
    ]
})
export class MoleculeCollectionModule { }
