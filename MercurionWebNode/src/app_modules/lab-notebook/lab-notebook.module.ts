import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabNotebookLink } from './models/dto/lab-notebook-link.entity';
import { NotebookChapter } from './models/entities/lab-notebook-chapter.entity';
import { NotebookPage } from './models/entities/lab-notebook-page.entity';
import { NotebookSection } from './models/entities/lab-notebook-section.entity';
import { LabNotebook } from './models/entities/lab-notebook.entity';
import { LabNotebookService } from './services/lab-notebook.service';
import { NotebookPageService } from './services/notebook-page.service';
import { NotebookChapterService } from './services/notebook-chapter.service';
import { NotebookSectionService } from './services/notebook-section.service';
import { NotebookPagePageResolver } from './resolvers/page.resolver';
import { NotebookChapterResolver } from './resolvers/notebook-chapter.resolver';
import { NotebookSectionResolver } from './resolvers/notebook-section.resolver';
import { LabNotebookResolver } from './resolvers/lab-notebook.resolver';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            LabNotebookLink,
            NotebookChapter,
            NotebookPage,
            NotebookSection,
            LabNotebook 
        ])
    ],
    providers: [
        LabNotebookService,
        NotebookPageService,
        NotebookChapterService,
        NotebookSectionService,
        NotebookPagePageResolver,
        NotebookChapterResolver,
        NotebookSectionResolver,
        LabNotebookResolver
    ]
})
export class LabNotebookModule { }
