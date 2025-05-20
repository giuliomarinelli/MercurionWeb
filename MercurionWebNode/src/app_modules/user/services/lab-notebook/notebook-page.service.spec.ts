import { Test, TestingModule } from '@nestjs/testing';
import { NotebookPageService } from './notebook-page.service';

describe('NotebookPageService', () => {
  let service: NotebookPageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotebookPageService],
    }).compile();

    service = module.get<NotebookPageService>(NotebookPageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
