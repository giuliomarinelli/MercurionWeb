import { Test, TestingModule } from '@nestjs/testing';
import { JwtToolsService } from './jwt-tools.service';

describe('JwtToolsService', () => {
  let service: JwtToolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtToolsService],
    }).compile();

    service = module.get<JwtToolsService>(JwtToolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
