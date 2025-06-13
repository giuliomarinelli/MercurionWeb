import { Test, TestingModule } from '@nestjs/testing';
import { CustomMoleculeItemService } from './custom-molecule-item.service';

describe('CustomMoleculeItemService', () => {
  let service: CustomMoleculeItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomMoleculeItemService],
    }).compile();

    service = module.get<CustomMoleculeItemService>(CustomMoleculeItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
