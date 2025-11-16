import { Test, TestingModule } from '@nestjs/testing';
import { MeiliPreferredNameItPreviewService } from './meili-preferred-name-it-preview.service';

describe('MeiliPreferredNameItPreviewService', () => {
  let service: MeiliPreferredNameItPreviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeiliPreferredNameItPreviewService],
    }).compile();

    service = module.get<MeiliPreferredNameItPreviewService>(MeiliPreferredNameItPreviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
