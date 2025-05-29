import { Test, TestingModule } from '@nestjs/testing';
import { NotebookSectionService } from './notebook-section.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';

describe('NotebookSectionService', () => {
  let service: NotebookSectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotebookSectionService,
        { provide: getRepositoryToken(NotebookSection), useValue: {} },
      ],
    }).compile();

    service = module.get<NotebookSectionService>(NotebookSectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
