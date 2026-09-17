import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChEMBLMoleculeItemEntity } from './models/entities/chembl-molecule-item.entity';
import { CustomMoleculeItemEntity } from './models/entities/custom-molecule-item.entity';
import { MoleculeCollection } from './models/entities/molecule-collection.entity';
import { MoleculeCollectionItemJoin } from './models/entities/molecule-collection-item-join.entity';
import { MoleculeCollectionItemEntity } from './models/entities/molecule-collection-item.entity';
import { MoleculeCollectionService } from './services/molecule-collection.service';
import { MoleculeCollectionItemService } from './services/molecule-collection-item.service';
import { MoleculeCollectionResolver } from './resolvers/molecule-collection.resolver';
import { MoleculeCollectionItemResolver } from './resolvers/molecule-collection-item.resolver';
import { MoleculeCollectionItemJoinService } from './services/molecule-collection-item-join.service';
import { CustomMoleculeItemService } from './services/custom-molecule-item.service';
import { ChEMBLMoleculeItemResolver } from './resolvers/chembl-molecule-item.resolver';
import { CustomMoleculeItemResolver } from './resolvers/custom-molecule-item.resolver';
import { ChEMBLMoleculeItemService } from './services/chembl-molecule-item.service';
import { History } from '../history/models/entities/history.entity';
import { InitialWorkspaceService } from './services/initial-workspace.service';
import { MoleculeOwnershipPolicy } from './services/molecule-ownership.policy';

@Global()
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
        ChEMBLMoleculeItemService,
        InitialWorkspaceService,
        MoleculeOwnershipPolicy
    ],
    exports: [
        ChEMBLMoleculeItemService,
        InitialWorkspaceService
    ]
})
export class MoleculeCollectionModule { }
