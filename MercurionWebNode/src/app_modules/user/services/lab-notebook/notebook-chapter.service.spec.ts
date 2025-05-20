import { Test, TestingModule } from '@nestjs/testing';
import { NotebookChapterService } from './notebook-chapter.service';

describe('NotebookChapterService', () => {
  let service: NotebookChapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotebookChapterService],
    }).compile();

    service = module.get<NotebookChapterService>(NotebookChapterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
