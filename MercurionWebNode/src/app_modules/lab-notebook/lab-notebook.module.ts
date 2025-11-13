import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabNotebookLink } from './Models/DTO/lab-notebook-link.entity';
import { NotebookChapter } from './Models/entities/lab-notebook-chapter.entity';
import { NotebookPage } from './Models/entities/lab-notebook-page.entity';
import { NotebookSection } from './Models/entities/lab-notebook-section.entity';
import { LabNotebook } from './Models/entities/lab-notebook.entity';
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
