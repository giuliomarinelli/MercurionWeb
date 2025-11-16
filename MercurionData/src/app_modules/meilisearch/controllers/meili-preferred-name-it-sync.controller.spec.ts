import { Test, TestingModule } from '@nestjs/testing';
import { MeiliPreferredNameItSyncController } from './meili-preferred-name-it-sync.controller';

describe('MeiliPreferredNameItSyncController', () => {
  let controller: MeiliPreferredNameItSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeiliPreferredNameItSyncController],
    }).compile();

    controller = module.get<MeiliPreferredNameItSyncController>(MeiliPreferredNameItSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
