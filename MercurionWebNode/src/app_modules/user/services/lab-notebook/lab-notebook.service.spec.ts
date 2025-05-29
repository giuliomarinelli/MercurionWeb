import { Test, TestingModule } from '@nestjs/testing';
import { LabNotebookService } from './lab-notebook.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';

describe('LabNotebookService', () => {
  let service: LabNotebookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabNotebookService,
        { provide: getRepositoryToken(LabNotebook), useValue: {} },
      ],
    }).compile();

    service = module.get<LabNotebookService>(LabNotebookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
