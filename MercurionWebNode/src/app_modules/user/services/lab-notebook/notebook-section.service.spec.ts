import { Test, TestingModule } from '@nestjs/testing';
import { NotebookSectionService } from './notebook-section.service';

describe('NotebookSectionService', () => {
  let service: NotebookSectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotebookSectionService],
    }).compile();

    service = module.get<NotebookSectionService>(NotebookSectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
