import { Test, TestingModule } from '@nestjs/testing';
import { Chembl36ToMeilisearchSyncController } from './chembl_36_to_meilisearch_sync.controller';

describe('Chembl36ToMeilisearchSyncController', () => {
  let controller: Chembl36ToMeilisearchSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Chembl36ToMeilisearchSyncController],
    }).compile();

    controller = module.get<Chembl36ToMeilisearchSyncController>(Chembl36ToMeilisearchSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
