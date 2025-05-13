import { Test, TestingModule } from '@nestjs/testing';
import { LabNotebookController } from './lab-notebook.controller';

describe('LabNotebookController', () => {
  let controller: LabNotebookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabNotebookController],
    }).compile();

    controller = module.get<LabNotebookController>(LabNotebookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
