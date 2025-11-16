import { Test, TestingModule } from '@nestjs/testing';
import { PreferredNameTranslationService } from './preferred-name-translation.service';

describe('PreferredNameTranslationService', () => {
  let service: PreferredNameTranslationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreferredNameTranslationService],
    }).compile();

    service = module.get<PreferredNameTranslationService>(PreferredNameTranslationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
