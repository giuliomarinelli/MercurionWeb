import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';
import { ChEMBLMoleculeItemEntity } from './Models/entities/chembl-molecule-item.entity';
import { CustomMoleculeItemEntity } from './Models/entities/custom-molecule-item.entity';
import { MoleculeCollection } from './Models/entities/molecule-collection.entity';
import { MoleculeCollectionItemJoin } from './Models/entities/molecule-collection-item-join.entity';
import { MoleculeCollectionItemEntity } from './Models/entities/molecule-collection-item.entity';
import { LabNotebookEntry } from './Models/entities/lab-notbook-entry.entity';
import { LabNotebookLink } from './Models/entities/lab-notebook-link.entity';
import { LabNotebookService } from './services/lab-notebook.service';
import { LabNotebookController } from './controllers/lab-notebook.controller';
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
    LabNotebook
  ])],
  providers: [
    UserService,
    LabNotebookService,
    NotebookPageService,
    NotebookChapterService,
    NotebookSectionService,
    PageResolver,
    NotebookChapterResolver,
    NotebookSectionResolver
  ],
  exports: [UserService, TypeOrmModule],
  controllers: [LabNotebookController]
})
export class UserModule { }
