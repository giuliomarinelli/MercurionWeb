import { Test, TestingModule } from '@nestjs/testing';
import { NotebookChapterService } from './notebook-chapter.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotebookChapter } from '../Models/entities/lab-notebook-chapter.entity';

describe('NotebookChapterService', () => {
  let service: NotebookChapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotebookChapterService,
        { provide: getRepositoryToken(NotebookChapter), useValue: {} },
      ],
    }).compile();

    service = module.get<NotebookChapterService>(NotebookChapterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
