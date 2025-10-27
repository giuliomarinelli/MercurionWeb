import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';
import { LabNotebookLink } from './Models/DTO/lab-notebook/lab-notebook-link.entity';
import { NotebookPageService } from './services/lab-notebook/notebook-page.service';
import { NotebookChapter } from './Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { NotebookPage } from './Models/entities/lab-notebook/lab-notebook-page.entity';
import { NotebookSection } from './Models/entities/lab-notebook/lab-notebook-section.entity';
import { LabNotebook } from './Models/entities/lab-notebook/lab-notebook.entity';
import { NotebookChapterService } from './services/lab-notebook/notebook-chapter.service';
import { NotebookSectionService } from './services/lab-notebook/notebook-section.service';
import { NotebookPagePageResolver } from './resolvers/lab-notebook/page.resolver';
import { NotebookChapterResolver } from './resolvers/lab-notebook/notebook-chapter.resolver';
import { NotebookSectionResolver } from './resolvers/lab-notebook/notebook-section.resolver';
import { LabNotebookResolver } from './resolvers/lab-notebook/lab-notebook.resolver';
import { LabNotebookService } from './services/lab-notebook/lab-notebook.service';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { AuthModule } from '../auth/auth.module';
import { History } from '../history/Models/entities/history.entity';
import { MoleculeCollectionModule } from '../molecule-collection/molecule-collection.module';


@Module({
  imports: [TypeOrmModule.forFeature([
    User,
    MfaBackupCode,
    LabNotebookLink,
    NotebookChapter,
    NotebookPage,
    NotebookSection,
    LabNotebook,
    History
  ]),
  MeilisearchModule,
  forwardRef(() => AuthModule),
  forwardRef(() => MoleculeCollectionModule),
  ],
  providers: [
    UserService,
    LabNotebookService,
    NotebookPageService,
    NotebookChapterService,
    NotebookSectionService,
    NotebookPagePageResolver,
    NotebookChapterResolver,
    NotebookSectionResolver,
    LabNotebookResolver
  ],
  exports: [UserService, TypeOrmModule],
  controllers: []
})
export class UserModule { }
