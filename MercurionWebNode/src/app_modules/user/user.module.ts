import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';
import { ChEMBLMoleculeItemEntity } from './Models/entities/molecule-collection/chembl-molecule-item.entity';
import { CustomMoleculeItemEntity } from './Models/entities/molecule-collection/custom-molecule-item.entity';
import { MoleculeCollection } from './Models/entities/molecule-collection/molecule-collection.entity';
import { MoleculeCollectionItemJoin } from './Models/entities/molecule-collection/molecule-collection-item-join.entity';
import { MoleculeCollectionItemEntity } from './Models/entities/molecule-collection/molecule-collection-item.entity';
import { LabNotebookEntry } from './Models/entities/lab-notbook-entry.entity';
import { LabNotebookLink } from './Models/entities/lab-notebook-link.entity';
import { NotebookPageService } from './services/lab-notebook/notebook-page.service';
import { NotebookChapter } from './Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { NotebookPage } from './Models/entities/lab-notebook/lab-notebook-page.entity';
import { NotebookSection } from './Models/entities/lab-notebook/lab-notebook-section.entity';
import { LabNotebook } from './Models/entities/lab-notebook/lab-notebook.entity';
import { NotebookChapterService } from './services/lab-notebook/notebook-chapter.service';
import { NotebookSectionService } from './services/lab-notebook/notebook-section.service';
import { PageResolver } from './resolvers/lab-notebook/page.resolver';
import { NotebookChapterResolver } from './resolvers/lab-notebook/notebook-chapter.resolver';
import { NotebookSectionResolver } from './resolvers/lab-notebook/notebook-section.resolver';
import { LabNotebookResolver } from './resolvers/lab-notebook/lab-notebook.resolver';
import { LabNotebookService } from './services/lab-notebook/lab-notebook.service';
import { SyntheticRouteEntity } from './Models/entities/synth/synthetic-route.entity';
import { SyntheticStepMoleculeRef } from './Models/entities/synth/synthetic-step-molecule-ref.entity';
import { SyntheticStepEntity } from './Models/entities/synth/synthetic-step.entity';
import { MoleculeCollectionService } from './services/molecule-collection/molecule-collection.service';
import { MoleculeCollectionItemService } from './services/molecule-collection/molecule-collection-item.service';
import { MoleculeCollectionResolver } from './resolvers/molecule-collection/molecule-collection.resolver';
import { MoleculeCollectionItemResolver } from './resolvers/molecule-collection/molecule-collection-item.resolver';
import { MoleculeCollectionItemJoinService } from './services/molecule-collection/molecule-collection-item-join.service';
import { MoleculeCollectionItemJoinResolver } from './resolvers/molecule-collection/molecule-collection-item-join.resolver';
import { CustomMoleculeItemService } from './services/molecule-collection/custom-molecule-item.service';
import { ChEMBLMoleculeItemResolver } from './resolvers/molecule-collection/chembl-molecule-collection-item.resolver';
import { CustomMoleculeItemResolver } from './resolvers/molecule-collection/custom-molecule-item.resolver';
import { ChEMBLMoleculeItemService } from './services/molecule-collection/chembl-molecule-item.service';
import { SyntheticRouteService } from './services/synth/synthetic-route.service';
import { SyntheticRouteResolver } from './resolvers/synth/synthetic-route.resolver';
import { SyntheticStepService } from './services/synth/synthetic-step.service';
import { SyntheticStepResolver } from './resolvers/synth/synthetic-step.resolver';
import { SyntheticStepMoleculeRefService } from './services/synth/synthetic-step-molecule-ref.service';
import { SyntheticStepMoleculeRefResolver } from './resolvers/synth/synthetic-step-molecule-ref.resolver';


@Module({
  imports: [TypeOrmModule.forFeature([
    User,
    MfaBackupCode,
    ChEMBLMoleculeItemEntity,
    CustomMoleculeItemEntity,
    MoleculeCollection,
    MoleculeCollectionItemJoin,
    MoleculeCollectionItemEntity,
    LabNotebookEntry,
    LabNotebookLink,
    NotebookChapter,
    NotebookPage,
    NotebookSection,
    LabNotebook,
    SyntheticRouteEntity,
    SyntheticStepMoleculeRef,
    SyntheticStepEntity
  ])],
  providers: [
    UserService,
    LabNotebookService,
    NotebookPageService,
    NotebookChapterService,
    NotebookSectionService,
    PageResolver,
    NotebookChapterResolver,
    NotebookSectionResolver,
    LabNotebookResolver,
    MoleculeCollectionService,
    MoleculeCollectionItemService,
    MoleculeCollectionResolver,
    MoleculeCollectionItemResolver,
    MoleculeCollectionItemJoinService,
    MoleculeCollectionItemJoinResolver,
    CustomMoleculeItemService,
    ChEMBLMoleculeItemResolver,
    CustomMoleculeItemResolver,
    ChEMBLMoleculeItemService,
    SyntheticRouteService,
    SyntheticRouteResolver,
    SyntheticStepService,
    SyntheticStepResolver,
    SyntheticStepMoleculeRefService,
    SyntheticStepMoleculeRefResolver
  ],
  exports: [UserService, TypeOrmModule],
  controllers: []
})
export class UserModule { }
