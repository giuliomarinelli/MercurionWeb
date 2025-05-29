import { Test, TestingModule } from '@nestjs/testing';
import { NotebookPageService } from './notebook-page.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';

describe('NotebookPageService', () => {
  let service: NotebookPageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotebookPageService,
        { provide: getRepositoryToken(NotebookPage), useValue: {} },
      ],
    }).compile();

    service = module.get<NotebookPageService>(NotebookPageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
